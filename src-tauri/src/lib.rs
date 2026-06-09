mod config;
mod pty;
mod state;

use pty::PtyState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            pty::create_session,
            pty::write_session,
            pty::resize_session,
            pty::close_session,
            config::get_config,
            config::open_config,
            state::get_state,
            state::save_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running abergin");
}
