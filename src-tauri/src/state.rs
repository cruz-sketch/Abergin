use std::path::{Path, PathBuf};

use parking_lot::Mutex;
use serde_json::{json, Value};
use tauri::Manager;

#[derive(Default)]
pub struct StateStore {
    write_lock: Mutex<()>,
}

fn write_json(path: &Path, value: &Value) -> Result<(), String> {
    let pretty = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    let backup = path.with_extension("json.bak");
    std::fs::write(&tmp, pretty).map_err(|e| e.to_string())?;
    if path.exists() {
        std::fs::copy(path, &backup).map_err(|e| e.to_string())?;
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    if let Err(error) = std::fs::rename(tmp, path) {
        if backup.exists() {
            let _ = std::fs::copy(&backup, path);
        }
        return Err(error.to_string());
    }
    Ok(())
}

fn read_state(path: &Path) -> Option<Value> {
    [path.to_path_buf(), path.with_extension("json.bak")]
        .into_iter()
        .find_map(|candidate| {
            std::fs::read_to_string(candidate)
                .ok()
                .and_then(|text| serde_json::from_str::<Value>(&text).ok())
                .filter(Value::is_object)
        })
}

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
    let mut value =
        read_state(&state_path(&app)?).unwrap_or_else(|| json!({ "tabs": [], "ssh": [] }));

    // Always expose the resolved ssh client path (computed, not persisted).
    value["sshPath"] = json!(ssh_path());
    Ok(value)
}

#[tauri::command]
pub fn save_state(
    app: tauri::AppHandle,
    store: tauri::State<'_, StateStore>,
    state: Value,
) -> Result<(), String> {
    if !state.is_object() {
        return Err("state must be a JSON object".into());
    }
    let _guard = store.write_lock.lock();
    write_json(&state_path(&app)?, &state)
}
