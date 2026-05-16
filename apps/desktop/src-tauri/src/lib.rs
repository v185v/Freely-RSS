mod ai_actions;
mod ai_insights;
mod local_api;
mod reader_queue;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            storage::setup_local_storage(app)?;
            local_api::setup_local_api(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai_actions::answer_article_question,
            ai_actions::generate_article_translation,
            ai_insights::generate_article_insights,
            local_api::get_local_api_status,
            reader_queue::load_reader_queue_articles
        ])
        .run(tauri::generate_context!())
        .expect("error while running FreelyRSS desktop application");
}
