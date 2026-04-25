mod reader_queue;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(storage::setup_local_storage)
        .invoke_handler(tauri::generate_handler![reader_queue::load_reader_queue_articles])
        .run(tauri::generate_context!())
        .expect("error while running FreelyRSS desktop application");
}
