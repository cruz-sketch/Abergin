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
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
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
    for arg in &profile.args {
        cmd.arg(arg);
    }
    let cwd = profile
        .cwd
        .clone()
        .filter(|c| !c.is_empty())
        .or_else(dirs_home);
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    // A few programs check this to enable rich output.
    cmd.env("TERM", "xterm-256color");
    // Expose the active profile name to the shell (handy for prompts/scripts).
    cmd.env("ABERGIN_PROFILE", &profile.name);

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = state.counter.fetch_add(1, Ordering::SeqCst);

    state.sessions.lock().insert(
        id,
        Session {
            master: pair.master,
            writer,
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
    let mut sessions = state.sessions.lock();
    let sess = sessions
        .get_mut(&id)
        .ok_or_else(|| format!("session {id} does not exist"))?;
    sess.writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    sess.writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resize_session(
    state: tauri::State<'_, PtyState>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let sess = sessions
        .get(&id)
        .ok_or_else(|| format!("session {id} does not exist"))?;
    sess.master
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
    if let Some(mut sess) = state.sessions.lock().remove(&id) {
        let _ = sess.child.kill();
    }
    Ok(())
}

fn dirs_home() -> Option<String> {
    std::env::var("USERPROFILE").ok()
}
