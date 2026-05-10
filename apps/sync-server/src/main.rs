use freelyrss_sync_server::{SyncServerState, app};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bind_addr =
        std::env::var("FREELYRSS_SYNC_BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:4080".to_owned());
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;

    println!("freelyrss sync server listening on http://{bind_addr}");

    axum::serve(listener, app(SyncServerState::default())).await?;

    Ok(())
}
