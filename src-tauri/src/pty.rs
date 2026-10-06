use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

use base64::Engine;
use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// One running shell session, keyed by an incrementing id.
struct Session {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    reader: Option<Box<dyn Read + Send>>,
}

#[derive(Default)]
pub struct PtyState {
    sessions: Arc<Mutex<HashMap<u32, Session>>>,
    counter: AtomicU32,
}

#[derive(Debug, Deserialize)]
pub struct ProfileInput {
    pub name: String,
    pub shell: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub cwd: Option<String>,
}

#[derive(Serialize, Clone)]
struct OutputPayload {
    id: u32,
    data: String, // base64-encoded raw bytes
}

#[derive(Serialize, Clone)]
struct ExitPayload {
    id: u32,
}

// Git Bash does not emit OSC 7 by default. PROMPT_COMMAND runs after each
// command and after the user's login scripts, so the saved cwd follows `cd`.
const BASH_CWD_PROMPT: &str = r#"__abergin_cwd="$(cygpath -m -- "$PWD" 2>/dev/null)" || __abergin_cwd="$PWD"; __abergin_cwd="${__abergin_cwd//%/%25}"; __abergin_cwd="${__abergin_cwd// /%20}"; __abergin_cwd="${__abergin_cwd//#/%23}"; if [[ $__abergin_cwd == //* ]]; then __abergin_uri="file:${__abergin_cwd}"; elif [[ $__abergin_cwd == /* ]]; then __abergin_uri="file://${__abergin_cwd}"; else __abergin_uri="file:///${__abergin_cwd}"; fi; printf '\033]7;%s\007' "$__abergin_uri""#;
const WSL_BASH_CWD_PROMPT: &str = r#"__abergin_cwd="${PWD//%/%25}"; __abergin_cwd="${__abergin_cwd// /%20}"; __abergin_cwd="${__abergin_cwd//#/%23}"; __abergin_cwd="${__abergin_cwd//\?/%3F}"; printf '\033]7;file://%s\007' "$__abergin_cwd""#;
const WSL_SH_CWD_PROMPT: &str = r#"$(printf '\033]777;abergin;wsl;%s\007' "$PWD")"#;

fn shell_name(shell: &str) -> &str {
    shell.rsplit(['/', '\\']).next().unwrap_or(shell)
}

fn is_bash(shell: &str) -> bool {
    let name = shell_name(shell);
    name.eq_ignore_ascii_case("bash.exe") || name == "bash"
}

fn is_cmd(shell: &str) -> bool {
    shell_name(shell).eq_ignore_ascii_case("cmd.exe")
}

fn is_wsl(shell: &str) -> bool {
    shell_name(shell).eq_ignore_ascii_case("wsl.exe")
}

fn prompt_command(hook: &str) -> String {
    let existing = std::env::var("PROMPT_COMMAND").unwrap_or_default();
    if existing.is_empty() {
        hook.to_string()
    } else {
        format!("{existing}; {hook}")
    }
}

fn wslenv_with_shell_hooks() -> String {
    let existing = std::env::var("WSLENV").unwrap_or_default();
    let entries = existing.split(':').filter(|entry| {
        !entry.is_empty() && !matches!(entry.split('/').next(), Some("PROMPT_COMMAND" | "PS1"))
    });
    entries
        .chain(["PROMPT_COMMAND/u", "PS1/u"])
        .collect::<Vec<_>>()
        .join(":")
}

#[tauri::command]
pub fn create_session(
    state: tauri::State<'_, PtyState>,
    profile: ProfileInput,
    cols: u16,
    rows: u16,
) -> Result<u32, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&profile.shell);
    let cwd = profile
        .cwd
        .clone()
        .filter(|c| !c.is_empty())
        .or_else(dirs_home);
    let wsl_cwd = is_wsl(&profile.shell) && cwd.as_deref().is_some_and(|dir| dir.starts_with('/'));
    if wsl_cwd {
        cmd.arg("--cd");
        cmd.arg(cwd.as_deref().unwrap());
    }
    for arg in &profile.args {
        cmd.arg(arg);
    }
    if !wsl_cwd {
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }
    }
    // A few programs check this to enable rich output.
    cmd.env("TERM", "xterm-256color");
    // Expose the active profile name to the shell (handy for prompts/scripts).
    cmd.env("ABERGIN_PROFILE", &profile.name);
    if is_bash(&profile.shell) {
        cmd.env("PROMPT_COMMAND", prompt_command(BASH_CWD_PROMPT));
    } else if is_cmd(&profile.shell) {
        let existing = std::env::var("PROMPT").unwrap_or_else(|_| "$P$G".to_string());
        cmd.env("PROMPT", format!("$E]777;abergin;cwd;$P$E\\{existing}"));
    } else if is_wsl(&profile.shell) {
        cmd.env("PROMPT_COMMAND", prompt_command(WSL_BASH_CWD_PROMPT));
        let existing = std::env::var("PS1").unwrap_or_else(|_| "$ ".to_string());
        cmd.env("PS1", format!("{WSL_SH_CWD_PROMPT}{existing}"));
        cmd.env("WSLENV", wslenv_with_shell_hooks());
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = state.counter.fetch_add(1, Ordering::SeqCst);

    state.sessions.lock().insert(
        id,
        Session {
            master: Arc::new(Mutex::new(pair.master)),
            writer: Arc::new(Mutex::new(writer)),
            child,
            reader: Some(reader),
        },
    );

    Ok(id)
}

#[tauri::command]
pub fn attach_session(
    app: AppHandle,
    state: tauri::State<'_, PtyState>,
    id: u32,
) -> Result<(), String> {
    let reader = state
        .sessions
        .lock()
        .get_mut(&id)
        .ok_or_else(|| format!("session {id} does not exist"))?
        .reader
        .take()
        .ok_or_else(|| format!("session {id} is already attached"))?;

    spawn_reader(app, id, reader, Arc::clone(&state.sessions));
    Ok(())
}

fn spawn_reader(
    app: AppHandle,
    id: u32,
    mut reader: Box<dyn Read + Send>,
    sessions: Arc<Mutex<HashMap<u32, Session>>>,
) {
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let encoded = base64::engine::general_purpose::STANDARD.encode(&buf[..n]);
                    let _ = app.emit("pty-output", OutputPayload { id, data: encoded });
                }
                Err(_) => break,
            }
        }
        sessions.lock().remove(&id);
        let _ = app.emit("pty-exit", ExitPayload { id });
    });
}

#[tauri::command]
pub fn write_session(
    state: tauri::State<'_, PtyState>,
    id: u32,
    data: String,
) -> Result<(), String> {
    // A slow child must not block commands for every other pane.
    let writer = Arc::clone(
        &state
            .sessions
            .lock()
            .get(&id)
            .ok_or_else(|| format!("session {id} does not exist"))?
            .writer,
    );
    let mut writer = writer.lock();
    writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resize_session(
    state: tauri::State<'_, PtyState>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let master = Arc::clone(
        &state
            .sessions
            .lock()
            .get(&id)
            .ok_or_else(|| format!("session {id} does not exist"))?
            .master,
    );
    master
        .lock()
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn close_session(state: tauri::State<'_, PtyState>, id: u32) -> Result<(), String> {
    let session = state.sessions.lock().remove(&id);
    if let Some(mut sess) = session {
        let _ = sess.child.kill();
    }
    Ok(())
}

fn dirs_home() -> Option<String> {
    std::env::var("USERPROFILE").ok()
}
