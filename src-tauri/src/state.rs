use std::path::{Path, PathBuf};

use serde_json::{json, Value};
use tauri::Manager;

/// `<config_dir>/abergin/state.json` — restored tabs and saved SSH connections.
fn state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("state.json"))
}

/// Location of the Windows OpenSSH client, falling back to a bare `ssh`
/// (resolved via PATH) if the well-known path is missing.
fn ssh_path() -> String {
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    let p = format!("{}\\System32\\OpenSSH\\ssh.exe", system_root);
    if Path::new(&p).exists() {
        p
    } else {
        "ssh".into()
    }
}

#[tauri::command]
pub fn get_state(app: tauri::AppHandle) -> Result<Value, String> {
    let mut value = std::fs::read_to_string(state_path(&app)?)
        .ok()
        .and_then(|t| serde_json::from_str::<Value>(&t).ok())
        .unwrap_or_else(|| json!({ "tabs": [], "ssh": [] }));

    // Always expose the resolved ssh client path (computed, not persisted).
    value["sshPath"] = json!(ssh_path());
    Ok(value)
}

#[tauri::command]
pub fn save_state(app: tauri::AppHandle, state: Value) -> Result<(), String> {
    let pretty = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    std::fs::write(state_path(&app)?, pretty).map_err(|e| e.to_string())?;
    Ok(())
}
