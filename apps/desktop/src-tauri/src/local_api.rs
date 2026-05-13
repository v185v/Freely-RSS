use std::{
    collections::HashMap,
    error::Error,
    io::{BufRead, BufReader, Write},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread::{self, JoinHandle},
    time::Duration,
};

use freelyrss_core_domain::sqlite::{
    ArticleSearchReadFilter, ArticleSearchSort, ArticleSearchStore,
};
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use tauri::{App, Manager, Runtime, State};

use crate::storage::DesktopStoragePaths;

const LOCAL_API_HOST: Ipv4Addr = Ipv4Addr::LOCALHOST;
const MAX_ARTICLE_LIST_LIMIT: usize = 200;
const DEFAULT_ARTICLE_LIST_LIMIT: usize = 100;

type LocalApiResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

#[derive(Clone, Debug)]
pub struct LocalApiConfig {
    bind_addr: SocketAddr,
    database_path: PathBuf,
    exports_dir: PathBuf,
    token: String,
}

impl LocalApiConfig {
    pub fn new(database_path: PathBuf, exports_dir: PathBuf, token: String) -> Self {
        Self {
            bind_addr: SocketAddr::from((LOCAL_API_HOST, 0)),
            database_path,
            exports_dir,
            token,
        }
    }

    #[cfg(test)]
    fn with_bind_addr(mut self, bind_addr: SocketAddr) -> Self {
        self.bind_addr = bind_addr;
        self
    }
}

#[derive(Clone, Debug)]
pub struct LocalApiServerStatus {
    pub bind_addr: SocketAddr,
    pub base_url: String,
    pub token: String,
    pub read_only: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalApiStatusDto {
    pub base_url: String,
    pub token: String,
    pub read_only: bool,
}

impl From<LocalApiServerStatus> for LocalApiStatusDto {
    fn from(value: LocalApiServerStatus) -> Self {
        Self {
            base_url: value.base_url,
            token: value.token,
            read_only: value.read_only,
        }
    }
}

pub struct LocalApiServer {
    status: LocalApiServerStatus,
    shutdown: Arc<AtomicBool>,
    thread: Mutex<Option<JoinHandle<()>>>,
}

impl LocalApiServer {
    pub fn start(config: LocalApiConfig) -> Result<Self, std::io::Error> {
        if config.bind_addr.ip() != IpAddr::V4(LOCAL_API_HOST) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "local desktop API must bind only to 127.0.0.1",
            ));
        }

        let listener = TcpListener::bind(config.bind_addr)?;
        let bind_addr = listener.local_addr()?;

        if bind_addr.ip() != IpAddr::V4(LOCAL_API_HOST) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "local desktop API resolved to a non-loopback bind address",
            ));
        }

        listener.set_nonblocking(true)?;

        let status_token = config.token.clone();
        let shutdown = Arc::new(AtomicBool::new(false));
        let server_shutdown = Arc::clone(&shutdown);
        let server_config = Arc::new(config);
        let thread = thread::spawn(move || {
            run_accept_loop(listener, server_config, server_shutdown);
        });

        Ok(Self {
            status: LocalApiServerStatus {
                bind_addr,
                base_url: format!("http://{bind_addr}"),
                token: status_token,
                read_only: true,
            },
            shutdown,
            thread: Mutex::new(Some(thread)),
        })
    }

    pub fn status(&self) -> LocalApiServerStatus {
        self.status.clone()
    }
}

impl Drop for LocalApiServer {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Relaxed);
        let _ = TcpStream::connect_timeout(&self.status.bind_addr, Duration::from_millis(100));

        if let Ok(mut thread) = self.thread.lock() {
            if let Some(thread) = thread.take() {
                let _ = thread.join();
            }
        }
    }
}

#[derive(Clone)]
pub struct LocalApiRuntimeState {
    server: Arc<LocalApiServer>,
}

impl LocalApiRuntimeState {
    fn new(server: LocalApiServer) -> Self {
        Self {
            server: Arc::new(server),
        }
    }

    fn status(&self) -> LocalApiStatusDto {
        self.server.status().into()
    }
}

#[tauri::command]
pub fn get_local_api_status(state: State<'_, LocalApiRuntimeState>) -> LocalApiStatusDto {
    state.status()
}

pub fn setup_local_api<R: Runtime>(app: &mut App<R>) -> Result<(), Box<dyn Error>> {
    let app_local_data_dir = app.path().app_local_data_dir()?;
    let storage_paths = DesktopStoragePaths::from_app_local_data_dir(app_local_data_dir);
    let token = generate_local_api_token()?;
    let config = LocalApiConfig::new(
        storage_paths.database.database_path,
        storage_paths.exports_dir,
        token,
    );
    let server = LocalApiServer::start(config).map_err(|error| -> Box<dyn Error> {
        Box::new(std::io::Error::new(
            error.kind(),
            format!("failed to start local desktop API: {error}"),
        ))
    })?;

    app.manage(LocalApiRuntimeState::new(server));

    Ok(())
}

fn generate_local_api_token() -> Result<String, std::io::Error> {
    let mut bytes = [0_u8; 32];
    getrandom::getrandom(&mut bytes).map_err(|error| {
        std::io::Error::other(format!("failed to generate local API token: {error}"))
    })?;

    Ok(encode_hex(&bytes))
}

fn encode_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut value = String::with_capacity(bytes.len() * 2);

    for byte in bytes {
        value.push(HEX[(byte >> 4) as usize] as char);
        value.push(HEX[(byte & 0x0f) as usize] as char);
    }

    value
}

fn run_accept_loop(listener: TcpListener, config: Arc<LocalApiConfig>, shutdown: Arc<AtomicBool>) {
    while !shutdown.load(Ordering::Relaxed) {
        match listener.accept() {
            Ok((stream, peer_addr)) => {
                if let Err(error) = handle_connection(stream, peer_addr, Arc::clone(&config)) {
                    eprintln!("FreelyRSS local API request failed: {error}");
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(25));
            }
            Err(error) => {
                eprintln!("FreelyRSS local API listener failed: {error}");
                break;
            }
        }
    }
}

fn handle_connection(
    mut stream: TcpStream,
    peer_addr: SocketAddr,
    config: Arc<LocalApiConfig>,
) -> LocalApiResult<()> {
    stream.set_read_timeout(Some(Duration::from_millis(500)))?;
    stream.set_write_timeout(Some(Duration::from_millis(500)))?;

    let request = match HttpRequest::read_from(&stream) {
        Ok(request) => request,
        Err(error) => {
            write_response(
                &mut stream,
                HttpResponse::json_error(400, "badRequest", &error.to_string()),
            )?;
            return Ok(());
        }
    };

    let response = route_request(peer_addr, request, &config);
    write_response(&mut stream, response)?;

    Ok(())
}

fn route_request(
    peer_addr: SocketAddr,
    request: HttpRequest,
    config: &LocalApiConfig,
) -> HttpResponse {
    if !peer_addr.ip().is_loopback() {
        return HttpResponse::json_error(
            403,
            "loopbackOnly",
            "FreelyRSS local desktop API accepts loopback callers only",
        );
    }

    if !request.is_authorized(&config.token) {
        return HttpResponse::unauthorized();
    }

    if request.method != "GET" {
        return HttpResponse::json_error(
            403,
            "mutationRequiresUserConfirmation",
            "FreelyRSS local desktop API is read-only until a desktop user confirmation flow authorizes a mutation",
        );
    }

    match handle_get(&request, config) {
        Ok(response) => response,
        Err(error) => HttpResponse::json_error(500, "localApiFailure", &error.to_string()),
    }
}

fn handle_get(request: &HttpRequest, config: &LocalApiConfig) -> LocalApiResult<HttpResponse> {
    match request.path.as_str() {
        "/health" => HttpResponse::json(200, &LocalApiHealthDto::ok()),
        "/feeds" => HttpResponse::json(200, &list_feeds(&config.database_path)?),
        "/articles" => HttpResponse::json(200, &list_articles(&config.database_path, request)?),
        "/search" => {
            if request
                .query_value("q")
                .unwrap_or_default()
                .trim()
                .is_empty()
            {
                return Ok(HttpResponse::json_error(
                    400,
                    "missingSearchQuery",
                    "GET /search requires a non-empty q parameter",
                ));
            }

            HttpResponse::json(200, &list_articles(&config.database_path, request)?)
        }
        "/exports" => HttpResponse::json(200, &list_export_entry_points(&config.exports_dir)),
        path if path.starts_with("/articles/") => {
            let article_id = percent_decode(&path["/articles/".len()..]);
            match get_article_detail(&config.database_path, &article_id)? {
                Some(article) => HttpResponse::json(200, &article),
                None => Ok(HttpResponse::json_error(
                    404,
                    "articleNotFound",
                    "No article exists for the requested id",
                )),
            }
        }
        _ => Ok(HttpResponse::json_error(
            404,
            "notFound",
            "FreelyRSS local desktop API route not found",
        )),
    }
}

#[derive(Debug)]
struct HttpRequest {
    method: String,
    path: String,
    query: HashMap<String, Vec<String>>,
    headers: HashMap<String, String>,
}

impl HttpRequest {
    fn read_from(stream: &TcpStream) -> LocalApiResult<Self> {
        let mut reader = BufReader::new(stream.try_clone()?);
        let mut request_line = String::new();
        reader.read_line(&mut request_line)?;

        let request_line = request_line.trim_end_matches(['\r', '\n']);
        let mut request_parts = request_line.split_whitespace();
        let method = request_parts
            .next()
            .ok_or_else(|| "missing HTTP method".to_owned())?
            .to_owned();
        let target = request_parts
            .next()
            .ok_or_else(|| "missing HTTP request target".to_owned())?;

        let (path, query) = parse_request_target(target);
        let mut headers = HashMap::new();

        loop {
            let mut line = String::new();
            reader.read_line(&mut line)?;
            let trimmed = line.trim_end_matches(['\r', '\n']);

            if trimmed.is_empty() {
                break;
            }

            if let Some((name, value)) = trimmed.split_once(':') {
                headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_owned());
            }
        }

        Ok(Self {
            method,
            path,
            query,
            headers,
        })
    }

    fn is_authorized(&self, token: &str) -> bool {
        self.headers
            .get("authorization")
            .and_then(|value| value.strip_prefix("Bearer "))
            .is_some_and(|value| value == token)
    }

    fn query_value(&self, name: &str) -> Option<String> {
        self.query
            .get(name)
            .and_then(|values| values.first())
            .cloned()
    }

    fn query_values(&self, name: &str) -> Vec<String> {
        self.query.get(name).cloned().unwrap_or_default()
    }
}

fn parse_request_target(target: &str) -> (String, HashMap<String, Vec<String>>) {
    let (path, query_text) = target.split_once('?').unwrap_or((target, ""));
    let mut query = HashMap::new();

    for item in query_text.split('&').filter(|item| !item.is_empty()) {
        let (name, value) = item.split_once('=').unwrap_or((item, ""));
        query
            .entry(percent_decode(name))
            .or_insert_with(Vec::new)
            .push(percent_decode(value));
    }

    (percent_decode(path), query)
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                output.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                let high = hex_value(bytes[index + 1]);
                let low = hex_value(bytes[index + 2]);

                if let (Some(high), Some(low)) = (high, low) {
                    output.push((high << 4) | low);
                    index += 3;
                } else {
                    output.push(bytes[index]);
                    index += 1;
                }
            }
            byte => {
                output.push(byte);
                index += 1;
            }
        }
    }

    String::from_utf8_lossy(&output).into_owned()
}

fn hex_value(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

struct HttpResponse {
    status_code: u16,
    reason: &'static str,
    headers: Vec<(&'static str, String)>,
    body: String,
}

impl HttpResponse {
    fn json<T: Serialize>(status_code: u16, value: &T) -> LocalApiResult<Self> {
        Ok(Self {
            status_code,
            reason: reason_phrase(status_code),
            headers: vec![("Content-Type", "application/json; charset=utf-8".to_owned())],
            body: serde_json::to_string(value)?,
        })
    }

    fn json_error(status_code: u16, error: &str, message: &str) -> Self {
        let body = serde_json::to_string(&LocalApiErrorDto { error, message })
            .expect("local API error responses should serialize");

        Self {
            status_code,
            reason: reason_phrase(status_code),
            headers: vec![("Content-Type", "application/json; charset=utf-8".to_owned())],
            body,
        }
    }

    fn unauthorized() -> Self {
        let mut response = Self::json_error(
            401,
            "unauthorized",
            "Missing or invalid local desktop API bearer token",
        );
        response.headers.push((
            "WWW-Authenticate",
            "Bearer realm=\"FreelyRSS Local API\"".to_owned(),
        ));
        response
    }
}

fn write_response(stream: &mut TcpStream, response: HttpResponse) -> std::io::Result<()> {
    let body = response.body.as_bytes();
    write!(
        stream,
        "HTTP/1.1 {} {}\r\n",
        response.status_code, response.reason
    )?;

    for (name, value) in response.headers {
        write!(stream, "{name}: {value}\r\n")?;
    }

    write!(
        stream,
        "Content-Length: {}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n",
        body.len()
    )?;
    stream.write_all(body)?;
    stream.flush()
}

fn reason_phrase(status_code: u16) -> &'static str {
    match status_code {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        500 => "Internal Server Error",
        _ => "OK",
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiErrorDto<'a> {
    error: &'a str,
    message: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiHealthDto {
    status: &'static str,
    boundary: &'static str,
    bind_host: &'static str,
    read_only: bool,
}

impl LocalApiHealthDto {
    fn ok() -> Self {
        Self {
            status: "ok",
            boundary: "local-desktop",
            bind_host: "127.0.0.1",
            read_only: true,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiFeedDto {
    id: String,
    title: String,
    display_title: String,
    site_url: Option<String>,
    feed_url: String,
    format: String,
    health_status: String,
    last_checked_at: Option<String>,
    last_success_at: Option<String>,
    article_count: i64,
    unread_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiArticleListItemDto {
    id: String,
    feed_id: String,
    feed_title: String,
    title: String,
    author: Option<String>,
    summary: Option<String>,
    search_snippet: Option<String>,
    published_at: Option<String>,
    estimated_reading_minutes: Option<i64>,
    state: LocalApiArticleStateDto,
    tag_ids: Vec<String>,
    attachment_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiArticleDetailDto {
    id: String,
    feed_id: String,
    feed_title: String,
    title: String,
    author: Option<String>,
    summary: Option<String>,
    content: Option<String>,
    content_mode: &'static str,
    canonical_url: Option<String>,
    original_url: Option<String>,
    published_at: Option<String>,
    fetched_at: String,
    language: Option<String>,
    thumbnail: Option<String>,
    word_count: Option<i64>,
    state: LocalApiArticleStateDto,
    tags: Vec<LocalApiTagDto>,
    annotations: Vec<LocalApiAnnotationDto>,
    attachments: Vec<LocalApiAttachmentDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiArticleStateDto {
    read_state: String,
    starred: bool,
    liked: bool,
    importance: String,
    read_later: bool,
    reading_progress: f64,
    last_opened_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiTagDto {
    id: String,
    name: String,
    color: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiAnnotationDto {
    id: String,
    annotation_type: String,
    selected_text: String,
    anchor: String,
    note: Option<String>,
    color: Option<String>,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiAttachmentDto {
    id: String,
    attachment_type: String,
    url: String,
    mime_type: Option<String>,
    duration: Option<i64>,
    size: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalApiExportEntryPointDto {
    id: &'static str,
    format: &'static str,
    scope: &'static str,
    route_hint: &'static str,
    requires_user_confirmation: bool,
    writes_files: bool,
    output_directory: String,
}

fn open_readonly_database(database_path: &Path) -> LocalApiResult<Option<Connection>> {
    if !database_path.exists() {
        return Ok(None);
    }

    let connection = Connection::open_with_flags(database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.pragma_update(None, "foreign_keys", "ON")?;

    Ok(Some(connection))
}

fn list_feeds(database_path: &Path) -> LocalApiResult<Vec<LocalApiFeedDto>> {
    let Some(connection) = open_readonly_database(database_path)? else {
        return Ok(Vec::new());
    };

    let mut statement = connection.prepare(
        "SELECT
            feed.id,
            feed.title,
            COALESCE(feed.custom_name, feed.title) AS display_title,
            feed.site_url,
            feed.feed_url,
            feed.format,
            feed.health_status,
            feed.last_checked_at,
            feed.last_success_at,
            COUNT(article.id) AS article_count,
            SUM(CASE WHEN COALESCE(user_state.read_state, 'unread') = 'unread' THEN 1 ELSE 0 END) AS unread_count
        FROM Feed feed
        LEFT JOIN Article article ON article.feed_id = feed.id
        LEFT JOIN UserState user_state ON user_state.article_id = article.id
        GROUP BY
            feed.id,
            feed.title,
            feed.custom_name,
            feed.site_url,
            feed.feed_url,
            feed.format,
            feed.health_status,
            feed.last_checked_at,
            feed.last_success_at,
            feed.sort_order
        ORDER BY feed.sort_order ASC, display_title ASC",
    )?;

    let rows = statement.query_map([], |row| {
        Ok(LocalApiFeedDto {
            id: row.get(0)?,
            title: row.get(1)?,
            display_title: row.get(2)?,
            site_url: row.get(3)?,
            feed_url: row.get(4)?,
            format: row.get(5)?,
            health_status: row.get(6)?,
            last_checked_at: row.get(7)?,
            last_success_at: row.get(8)?,
            article_count: row.get(9)?,
            unread_count: row.get::<_, Option<i64>>(10)?.unwrap_or(0),
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

fn list_articles(
    database_path: &Path,
    request: &HttpRequest,
) -> LocalApiResult<Vec<LocalApiArticleListItemDto>> {
    let Some(mut connection) = open_readonly_database(database_path)? else {
        return Ok(Vec::new());
    };

    let feed_ids = feed_ids_from_request(request);
    let feed_id_refs = feed_ids.iter().map(String::as_str).collect::<Vec<_>>();
    let query_text = request
        .query_value("q")
        .or_else(|| request.query_value("searchText"));
    let mut items = {
        let mut store = ArticleSearchStore::new(&mut connection);
        store.list_articles(
            query_text
                .as_deref()
                .filter(|value| !value.trim().is_empty()),
            &feed_id_refs,
            read_filter_from_request(request),
            sort_from_request(request),
        )?
    };

    let limit = limit_from_request(request);
    items.truncate(limit);

    Ok(items
        .into_iter()
        .map(|item| LocalApiArticleListItemDto {
            id: item.article.id.to_string(),
            feed_id: item.article.feed_id.to_string(),
            feed_title: item.feed_display_title,
            title: item.article.title,
            author: item.article.author,
            summary: item.article.summary,
            search_snippet: item.search_snippet,
            published_at: item.article.published_at.map(Into::into),
            estimated_reading_minutes: estimated_reading_minutes(item.article.word_count),
            state: LocalApiArticleStateDto {
                read_state: item.read_state.as_str().to_owned(),
                starred: item.starred,
                liked: false,
                importance: item.importance.as_str().to_owned(),
                read_later: item.read_later,
                reading_progress: default_reading_progress(item.read_state),
                last_opened_at: None,
            },
            tag_ids: load_article_tag_ids(&connection, item.article.id.as_str())
                .unwrap_or_default(),
            attachment_count: item.attachment_count,
        })
        .collect())
}

fn get_article_detail(
    database_path: &Path,
    article_id: &str,
) -> LocalApiResult<Option<LocalApiArticleDetailDto>> {
    let Some(connection) = open_readonly_database(database_path)? else {
        return Ok(None);
    };

    let mut statement = connection.prepare(
        "SELECT
            article.id,
            article.feed_id,
            COALESCE(feed.custom_name, feed.title) AS feed_display_title,
            article.title,
            article.author,
            article.summary,
            article.content_extracted,
            article.content_raw,
            article.canonical_url,
            article.original_url,
            article.published_at,
            article.fetched_at,
            article.language,
            article.thumbnail,
            article.word_count,
            COALESCE(user_state.read_state, 'unread') AS read_state,
            COALESCE(user_state.starred, 0) AS starred,
            COALESCE(user_state.liked, 0) AS liked,
            COALESCE(user_state.importance, 'normal') AS importance,
            COALESCE(user_state.read_later, 0) AS read_later,
            COALESCE(user_state.reading_progress, 0.0) AS reading_progress,
            user_state.last_opened_at
        FROM Article article
        INNER JOIN Feed feed ON feed.id = article.feed_id
        LEFT JOIN UserState user_state ON user_state.article_id = article.id
        WHERE article.id = ?1",
    )?;

    let article = statement.query_row([article_id], |row| {
        let content_extracted: Option<String> = row.get(6)?;
        let content_raw: Option<String> = row.get(7)?;
        let (content, content_mode) = match (content_extracted, content_raw) {
            (Some(content), _) => (Some(content), "extracted"),
            (None, Some(content)) => (Some(content), "raw"),
            (None, None) => (None, "empty"),
        };

        Ok(LocalApiArticleDetailDto {
            id: row.get(0)?,
            feed_id: row.get(1)?,
            feed_title: row.get(2)?,
            title: row.get(3)?,
            author: row.get(4)?,
            summary: row.get(5)?,
            content,
            content_mode,
            canonical_url: row.get(8)?,
            original_url: row.get(9)?,
            published_at: row.get(10)?,
            fetched_at: row.get(11)?,
            language: row.get(12)?,
            thumbnail: row.get(13)?,
            word_count: row.get(14)?,
            state: LocalApiArticleStateDto {
                read_state: row.get(15)?,
                starred: row.get::<_, i64>(16)? != 0,
                liked: row.get::<_, i64>(17)? != 0,
                importance: row.get(18)?,
                read_later: row.get::<_, i64>(19)? != 0,
                reading_progress: row.get(20)?,
                last_opened_at: row.get(21)?,
            },
            tags: load_article_tags(&connection, article_id)?,
            annotations: load_article_annotations(&connection, article_id)?,
            attachments: load_article_attachments(&connection, article_id)?,
        })
    });

    match article {
        Ok(article) => Ok(Some(article)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(Box::new(error)),
    }
}

fn list_export_entry_points(exports_dir: &Path) -> Vec<LocalApiExportEntryPointDto> {
    let output_directory = exports_dir.to_string_lossy().into_owned();

    vec![
        LocalApiExportEntryPointDto {
            id: "current-article-markdown",
            format: "markdown",
            scope: "currentArticle",
            route_hint: "Open the desktop export UI to confirm a Markdown export.",
            requires_user_confirmation: true,
            writes_files: false,
            output_directory: output_directory.clone(),
        },
        LocalApiExportEntryPointDto {
            id: "visible-queue-html",
            format: "html",
            scope: "visibleQueue",
            route_hint: "Open the desktop export UI to confirm an HTML export.",
            requires_user_confirmation: true,
            writes_files: false,
            output_directory: output_directory.clone(),
        },
        LocalApiExportEntryPointDto {
            id: "current-article-pdf",
            format: "pdf",
            scope: "currentArticle",
            route_hint: "Open the desktop print pipeline to confirm a PDF export.",
            requires_user_confirmation: true,
            writes_files: false,
            output_directory,
        },
    ]
}

fn load_article_tag_ids(
    connection: &Connection,
    article_id: &str,
) -> Result<Vec<String>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "SELECT tag_id
        FROM ArticleTag
        WHERE article_id = ?1
        ORDER BY tag_id ASC",
    )?;
    let rows = statement.query_map([article_id], |row| row.get::<_, String>(0))?;

    rows.collect()
}

fn load_article_tags(
    connection: &Connection,
    article_id: &str,
) -> Result<Vec<LocalApiTagDto>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "SELECT tag.id, tag.name, tag.color
        FROM ArticleTag article_tag
        INNER JOIN Tag tag ON tag.id = article_tag.tag_id
        WHERE article_tag.article_id = ?1
        ORDER BY tag.name ASC, tag.id ASC",
    )?;
    let rows = statement.query_map([article_id], |row| {
        Ok(LocalApiTagDto {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    })?;

    rows.collect()
}

fn load_article_annotations(
    connection: &Connection,
    article_id: &str,
) -> Result<Vec<LocalApiAnnotationDto>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "SELECT id, type, selected_text, anchor, note, color, created_at
        FROM Annotation
        WHERE article_id = ?1
        ORDER BY created_at ASC, id ASC",
    )?;
    let rows = statement.query_map([article_id], |row| {
        Ok(LocalApiAnnotationDto {
            id: row.get(0)?,
            annotation_type: row.get(1)?,
            selected_text: row.get(2)?,
            anchor: row.get(3)?,
            note: row.get(4)?,
            color: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    rows.collect()
}

fn load_article_attachments(
    connection: &Connection,
    article_id: &str,
) -> Result<Vec<LocalApiAttachmentDto>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "SELECT id, type, url, mime_type, duration, size
        FROM Attachment
        WHERE article_id = ?1
        ORDER BY id ASC",
    )?;
    let rows = statement.query_map([article_id], |row| {
        Ok(LocalApiAttachmentDto {
            id: row.get(0)?,
            attachment_type: row.get(1)?,
            url: row.get(2)?,
            mime_type: row.get(3)?,
            duration: row.get(4)?,
            size: row.get(5)?,
        })
    })?;

    rows.collect()
}

fn feed_ids_from_request(request: &HttpRequest) -> Vec<String> {
    let mut feed_ids = request.query_values("feedId");
    feed_ids.extend(
        request
            .query_values("feedIds")
            .into_iter()
            .flat_map(|value| {
                value
                    .split(',')
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .collect::<Vec<_>>()
            }),
    );
    feed_ids
}

fn read_filter_from_request(request: &HttpRequest) -> ArticleSearchReadFilter {
    match request.query_value("status").as_deref() {
        Some("unread") => ArticleSearchReadFilter::Unread,
        Some("reading") => ArticleSearchReadFilter::Reading,
        Some("readLater") | Some("read-later") => ArticleSearchReadFilter::ReadLater,
        Some("starred") => ArticleSearchReadFilter::Starred,
        _ => ArticleSearchReadFilter::All,
    }
}

fn sort_from_request(request: &HttpRequest) -> ArticleSearchSort {
    match request.query_value("sort").as_deref() {
        Some("oldest") => ArticleSearchSort::Oldest,
        _ => ArticleSearchSort::Newest,
    }
}

fn limit_from_request(request: &HttpRequest) -> usize {
    request
        .query_value("limit")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(DEFAULT_ARTICLE_LIST_LIMIT)
        .clamp(1, MAX_ARTICLE_LIST_LIMIT)
}

fn estimated_reading_minutes(word_count: Option<i64>) -> Option<i64> {
    word_count.map(|word_count| (((word_count as f64) / 180.0).ceil() as i64).max(1))
}

fn default_reading_progress(read_state: freelyrss_core_domain::ReadState) -> f64 {
    match read_state {
        freelyrss_core_domain::ReadState::Unread => 0.0,
        freelyrss_core_domain::ReadState::Reading => 0.5,
        freelyrss_core_domain::ReadState::Read => 1.0,
    }
}

#[cfg(test)]
mod tests {
    use std::{
        io::{Read, Write},
        net::{Ipv4Addr, SocketAddr, TcpStream},
        path::Path,
    };

    use freelyrss_core_domain::sqlite::{initialize_database, DatabaseInitializationOptions};
    use rusqlite::{params, Connection};
    use tempfile::tempdir;

    use super::{LocalApiConfig, LocalApiServer};

    const TOKEN: &str = "test-token";

    #[test]
    fn serves_authorized_feed_article_search_and_detail_requests_on_loopback() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("local-api.sqlite3");
        seed_database(&database_path);

        let server = LocalApiServer::start(LocalApiConfig::new(
            database_path,
            temp_dir.path().join("exports"),
            TOKEN.to_owned(),
        ))
        .expect("start local API");

        assert_eq!(server.status().bind_addr.ip(), Ipv4Addr::LOCALHOST);

        let feeds = authorized_get(server.status().bind_addr, "/feeds");
        assert!(feeds.starts_with("HTTP/1.1 200 OK"));
        assert!(feeds.contains("\"displayTitle\":\"Local API Feed\""));
        assert!(feeds.contains("\"articleCount\":1"));

        let articles = authorized_get(
            server.status().bind_addr,
            "/articles?q=Loopback&status=reading&limit=10",
        );
        assert!(articles.starts_with("HTTP/1.1 200 OK"));
        assert!(articles.contains("\"id\":\"article-local-api\""));
        assert!(articles.contains("\"searchSnippet\""));

        let detail = authorized_get(server.status().bind_addr, "/articles/article-local-api");
        assert!(detail.starts_with("HTTP/1.1 200 OK"));
        assert!(detail.contains("\"contentMode\":\"extracted\""));
        assert!(detail.contains("\"annotationType\":\"highlight\""));
        assert!(detail.contains("\"attachmentType\":\"audio\""));
        assert!(!detail.contains("localCachePath"));
    }

    #[test]
    fn rejects_missing_tokens_and_mutating_requests() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("local-api-auth.sqlite3");
        seed_database(&database_path);
        let server = LocalApiServer::start(LocalApiConfig::new(
            database_path,
            temp_dir.path().join("exports"),
            TOKEN.to_owned(),
        ))
        .expect("start local API");

        let unauthorized = raw_request(server.status().bind_addr, "GET /feeds HTTP/1.1\r\n\r\n");
        assert!(unauthorized.starts_with("HTTP/1.1 401 Unauthorized"));
        assert!(unauthorized.contains("\"error\":\"unauthorized\""));

        let mutation = raw_request(
            server.status().bind_addr,
            "POST /articles/article-local-api/read HTTP/1.1\r\nAuthorization: Bearer test-token\r\n\r\n",
        );
        assert!(mutation.starts_with("HTTP/1.1 403 Forbidden"));
        assert!(mutation.contains("mutationRequiresUserConfirmation"));
    }

    #[test]
    fn exposes_export_entry_points_without_file_writes() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("local-api-exports.sqlite3");
        seed_database(&database_path);
        let server = LocalApiServer::start(LocalApiConfig::new(
            database_path,
            temp_dir.path().join("exports"),
            TOKEN.to_owned(),
        ))
        .expect("start local API");

        let exports = authorized_get(server.status().bind_addr, "/exports");

        assert!(exports.starts_with("HTTP/1.1 200 OK"));
        assert!(exports.contains("\"format\":\"markdown\""));
        assert!(exports.contains("\"requiresUserConfirmation\":true"));
        assert!(exports.contains("\"writesFiles\":false"));
    }

    #[test]
    fn refuses_non_loopback_bind_addresses() {
        let temp_dir = tempdir().expect("temp dir");
        let config = LocalApiConfig::new(
            temp_dir.path().join("database.sqlite3"),
            temp_dir.path().join("exports"),
            TOKEN.to_owned(),
        )
        .with_bind_addr(SocketAddr::from(([0, 0, 0, 0], 0)));

        let error = match LocalApiServer::start(config) {
            Ok(_) => panic!("non-loopback bind should fail"),
            Err(error) => error,
        };

        assert_eq!(error.kind(), std::io::ErrorKind::PermissionDenied);
    }

    fn authorized_get(bind_addr: SocketAddr, path: &str) -> String {
        raw_request(
            bind_addr,
            &format!("GET {path} HTTP/1.1\r\nAuthorization: Bearer {TOKEN}\r\n\r\n"),
        )
    }

    fn raw_request(bind_addr: SocketAddr, request: &str) -> String {
        let mut stream = TcpStream::connect(bind_addr).expect("connect local API");
        stream.write_all(request.as_bytes()).expect("write request");
        stream
            .shutdown(std::net::Shutdown::Write)
            .expect("shutdown write");

        let mut response = String::new();
        stream.read_to_string(&mut response).expect("read response");
        response
    }

    fn seed_database(database_path: &Path) {
        initialize_database(database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let connection = Connection::open(database_path).expect("open database");
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format, health_status) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    "feed-local-api",
                    "Local API Feed",
                    "https://example.com/feed.xml",
                    "rss",
                    "healthy"
                ],
            )
            .expect("insert feed");
        connection
            .execute(
                "INSERT INTO Article (
                    id,
                    feed_id,
                    title,
                    summary,
                    content_extracted,
                    canonical_url,
                    original_url,
                    published_at,
                    word_count
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    "article-local-api",
                    "feed-local-api",
                    "Loopback REST boundary",
                    "REST summary",
                    "Loopback REST content is read through a permissioned desktop boundary.",
                    "https://example.com/article",
                    "https://example.com/original",
                    "2026-05-12T10:00:00Z",
                    360_i64
                ],
            )
            .expect("insert article");
        connection
            .execute(
                "INSERT INTO UserState (
                    article_id,
                    read_state,
                    starred,
                    liked,
                    importance,
                    read_later,
                    reading_progress,
                    last_opened_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    "article-local-api",
                    "reading",
                    1,
                    0,
                    "high",
                    1,
                    0.75_f64,
                    "2026-05-12T10:30:00Z"
                ],
            )
            .expect("insert user state");
        connection
            .execute(
                "INSERT INTO Tag (id, name, scope, color) VALUES (?1, ?2, ?3, ?4)",
                params!["tag-api", "API", "article", "#c0502d"],
            )
            .expect("insert tag");
        connection
            .execute(
                "INSERT INTO ArticleTag (article_id, tag_id) VALUES (?1, ?2)",
                params!["article-local-api", "tag-api"],
            )
            .expect("insert article tag");
        connection
            .execute(
                "INSERT INTO Annotation (id, article_id, type, selected_text, anchor, note, color, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    "annotation-api",
                    "article-local-api",
                    "highlight",
                    "permissioned desktop boundary",
                    "{\"quote\":\"permissioned desktop boundary\"}",
                    "Keep this local.",
                    "#ffcc66",
                    "2026-05-12T10:35:00Z"
                ],
            )
            .expect("insert annotation");
        connection
            .execute(
                "INSERT INTO Attachment (id, article_id, type, url, mime_type, duration, size, local_cache_path)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    "attachment-api",
                    "article-local-api",
                    "audio",
                    "https://example.com/audio.mp3",
                    "audio/mpeg",
                    120_i64,
                    4096_i64,
                    "C:/private/cache/audio.mp3"
                ],
            )
            .expect("insert attachment");
    }
}
