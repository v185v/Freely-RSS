mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(storage::setup_local_storage)
        .run(tauri::generate_context!())
        .expect("error while running FreelyRSS desktop application");
}
