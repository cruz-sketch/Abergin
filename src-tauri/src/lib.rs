mod config;
mod pty;
mod shell_integration;
mod state;

use pty::PtyState;
use shell_integration::LaunchState;
use state::StateStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Single-instance must be the first plugin. When a second launch happens
        // (e.g. another Explorer "Open in Abergin"), its directory is forwarded
        // to the already-running window instead of spawning a new process.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            use tauri::{Emitter, Manager};
            if let Some(dir) = shell_integration::dir_from_args(argv) {
                let _ = app.emit("open-cwd", dir);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyState::default())
        .manage(StateStore::default())
        .manage(LaunchState::from_args())
        .invoke_handler(tauri::generate_handler![
            pty::create_session,
            pty::attach_session,
            pty::write_session,
            pty::resize_session,
            pty::close_session,
            config::get_config,
            config::open_config,
            state::get_state,
            state::save_state,
            shell_integration::take_launch_cwd,
            shell_integration::set_explorer_integration,
            shell_integration::get_explorer_integration,
        ])
        .run(tauri::generate_context!())
        .expect("error while running abergin");
}
