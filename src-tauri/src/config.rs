use std::path::{Path, PathBuf};

use serde_json::{json, Value};
use tauri::Manager;

/// Returns `<config_dir>/abergin/config.json`, creating the folder if needed.
fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

fn exists(p: &str) -> bool {
    Path::new(p).exists()
}

/// Build the default config by probing the machine for available shells.
fn default_config() -> Value {
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    let program_files =
        std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".into());

    let powershell = format!(
        "{}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        system_root
    );
    let cmd = format!("{}\\System32\\cmd.exe", system_root);
    let wsl = format!("{}\\System32\\wsl.exe", system_root);
    let pwsh = format!("{}\\PowerShell\\7\\pwsh.exe", program_files);
    let git_bash = format!("{}\\Git\\bin\\bash.exe", program_files);

    let mut profiles: Vec<Value> = Vec::new();

    // PowerShell with bash-like (Emacs) line editing — ctrl+w / ctrl+a / ctrl+r…
    if exists(&powershell) {
        profiles.push(json!({
            "name": "PowerShell",
            "shell": powershell,
            "args": ["-NoLogo", "-NoExit", "-Command", "Set-PSReadLineOption -EditMode Emacs"],
            "cwd": null,
            "color": "#7aa2f7"
        }));
    }
    if exists(&pwsh) {
        profiles.push(json!({
            "name": "PowerShell 7",
            "shell": pwsh,
            "args": ["-NoLogo", "-NoExit", "-Command", "Set-PSReadLineOption -EditMode Emacs"],
            "cwd": null,
            "color": "#2f74c0"
        }));
    }
    if exists(&git_bash) {
        profiles.push(json!({
            "name": "Git Bash",
            "shell": git_bash,
            "args": ["-i", "-l"],
            "cwd": null,
            "color": "#f7768e"
        }));
    }
    if exists(&wsl) {
        profiles.push(json!({
            "name": "WSL",
            "shell": wsl,
            "args": [],
            "cwd": null,
            "color": "#9ece6a"
        }));
    }
    if exists(&cmd) {
        profiles.push(json!({
            "name": "Command Prompt",
            "shell": cmd,
            "args": [],
            "cwd": null,
            "color": "#e0af68"
        }));
    }

    let default_name = profiles
        .first()
        .and_then(|p| p.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("PowerShell")
        .to_string();

    json!({
        "default": default_name,
        "profiles": profiles,
        "fontFamily": "Cascadia Code, Cascadia Mono, Consolas, monospace",
        "fontSize": 13,
        "scrollback": 10000,
        "copyOnSelect": true,
        "theme": {
            "foreground": "#c0caf5",
            "background": "#1a1b26",
            "cursor": "#c0caf5",
            "selection": "#33467c",
            "black": "#15161e",
            "red": "#f7768e",
            "green": "#9ece6a",
            "yellow": "#e0af68",
            "blue": "#7aa2f7",
            "magenta": "#bb9af7",
            "cyan": "#7dcfff",
            "white": "#a9b1d6",
            "brightBlack": "#414868",
            "brightRed": "#f7768e",
            "brightGreen": "#9ece6a",
            "brightYellow": "#e0af68",
            "brightBlue": "#7aa2f7",
            "brightMagenta": "#bb9af7",
            "brightCyan": "#7dcfff",
            "brightWhite": "#c0caf5"
        }
    })
}

/// Load config.json, creating it from defaults on first launch.
#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<Value, String> {
    let path = config_path(&app)?;
    if let Ok(text) = std::fs::read_to_string(&path) {
        if let Ok(value) = serde_json::from_str::<Value>(&text) {
            return Ok(value);
        }
    }
    let cfg = default_config();
    let pretty = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, pretty).map_err(|e| e.to_string())?;
    Ok(cfg)
}

/// Open config.json in the user's default editor.
#[tauri::command]
pub fn open_config(app: tauri::AppHandle) -> Result<(), String> {
    let path = config_path(&app)?;
    if !path.exists() {
        let _ = get_config(app.clone());
    }
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &path.to_string_lossy()])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
