use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::time::Duration;

use base64::Engine;
use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// One running shell session, keyed by an incrementing id.
struct Session {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Option<Box<dyn Child + Send + Sync>>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    reader: Option<Box<dyn Read + Send>>,
    exit_sender: Sender<Option<ExitPayload>>,
    exit_receiver: Option<Receiver<Option<ExitPayload>>>,
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
    code: Option<u32>,
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
    let wsl = is_wsl(&profile.shell);
    if wsl && !super::wsl::is_ready(&profile.shell) {
        return Err("WSL is unavailable or no Linux distribution is installed for this Windows user. Run `wsl --list --verbose` in PowerShell to check the installation.".to_string());
    }

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
    let wsl_cwd = wsl && cwd.as_deref().is_some_and(|dir| dir.starts_with('/'));
    let wsl_supports_cd = wsl_cwd && super::wsl::supports_cd(&profile.shell);
    if wsl_supports_cd {
        cmd.arg("--cd");
        cmd.arg(cwd.as_deref().unwrap());
    }
    for arg in &profile.args {
        cmd.arg(arg);
    }
    if !wsl_supports_cd {
        let launch_cwd = if wsl_cwd { dirs_home() } else { cwd };
        if let Some(dir) = launch_cwd {
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
    let killer = child.clone_killer();

    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = state.counter.fetch_add(1, Ordering::SeqCst);
    let (exit_sender, exit_receiver) = mpsc::channel();

    state.sessions.lock().insert(
        id,
        Session {
            master: Arc::new(Mutex::new(pair.master)),
            writer: Arc::new(Mutex::new(writer)),
            child: Some(child),
            killer,
            reader: Some(reader),
            exit_sender,
            exit_receiver: Some(exit_receiver),
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
    let (reader, child, exit_receiver) = {
        let mut sessions = state.sessions.lock();
        let session = sessions
            .get_mut(&id)
            .ok_or_else(|| format!("session {id} does not exist"))?;
        if session.reader.is_none() || session.child.is_none() || session.exit_receiver.is_none() {
            return Err(format!("session {id} is already attached"));
        }
        (
            session.reader.take().unwrap(),
            session.child.take().unwrap(),
            session.exit_receiver.take().unwrap(),
        )
    };

    spawn_reader(app, id, reader, exit_receiver, Arc::clone(&state.sessions));
    spawn_exit_monitor(id, child, Arc::clone(&state.sessions));
    Ok(())
}

fn spawn_reader(
    app: AppHandle,
    id: u32,
    mut reader: Box<dyn Read + Send>,
    exit_receiver: Receiver<Option<ExitPayload>>,
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
        // The process monitor closes the ConPTY after the child exits. Read
        // until then so the frontend sees the final bytes before pty-exit.
        match exit_receiver.recv_timeout(Duration::from_secs(2)) {
            Ok(Some(payload)) => {
                let _ = app.emit("pty-exit", payload);
            }
            Ok(None) => {} // A pane was closed by the user.
            Err(RecvTimeoutError::Timeout) => {
                // The output pipe failed while the child was still alive.
                // Do not leave a session that can no longer show its output.
                let session = sessions.lock().remove(&id);
                if let Some(mut session) = session {
                    let _ = session.killer.kill();
                    let _ = app.emit("pty-exit", ExitPayload { id, code: None });
                }
            }
            Err(RecvTimeoutError::Disconnected) => {}
        }
    });
}

fn spawn_exit_monitor(
    id: u32,
    mut child: Box<dyn Child + Send + Sync>,
    sessions: Arc<Mutex<HashMap<u32, Session>>>,
) {
    std::thread::spawn(move || {
        let code = child.wait().ok().map(|status| status.exit_code());
        // Closing the master releases ConPTY's output pipe; the reader then
        // drains it and emits the exit event. A manual close removed the
        // session first, so it must not produce an exit event.
        let session = sessions.lock().remove(&id);
        if let Some(mut session) = session {
            if code.is_none() {
                let _ = session.killer.kill();
            }
            let _ = session.exit_sender.send(Some(ExitPayload { id, code }));
        }
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
        let _ = sess.exit_sender.send(None);
        let _ = sess.killer.kill();
    }
    Ok(())
}

fn dirs_home() -> Option<String> {
    std::env::var("USERPROFILE").ok()
}

#[cfg(all(test, windows))]
mod tests {
    use super::{spawn_exit_monitor, Session};
    use parking_lot::Mutex;
    use portable_pty::{native_pty_system, CommandBuilder, PtySize};
    use std::collections::HashMap;
    use std::io::Read;
    use std::sync::{mpsc, Arc};
    use std::time::Duration;

    #[test]
    fn shell_exit_releases_conpty_and_drains_output() {
        let pair = native_pty_system()
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();
        let mut command = CommandBuilder::new("cmd.exe");
        command.arg("/C");
        command.arg("echo abergin-final-output");
        let child = pair.slave.spawn_command(command).unwrap();
        let killer = child.clone_killer();
        let mut reader = pair.master.try_clone_reader().unwrap();
        let writer = pair.master.take_writer().unwrap();
        drop(pair.slave);

        let (exit_sender, exit_receiver) = mpsc::channel();
        let sessions = Arc::new(Mutex::new(HashMap::new()));
        sessions.lock().insert(
            1,
            Session {
                master: Arc::new(Mutex::new(pair.master)),
                writer: Arc::new(Mutex::new(writer)),
                child: None,
                killer,
                reader: None,
                exit_sender,
                exit_receiver: None,
            },
        );
        let (output_sender, output_receiver) = mpsc::channel();
        std::thread::spawn(move || {
            let mut output = Vec::new();
            let result = reader.read_to_end(&mut output).map(|_| output);
            let _ = output_sender.send(result);
        });
        spawn_exit_monitor(1, child, Arc::clone(&sessions));

        let exit = exit_receiver
            .recv_timeout(Duration::from_secs(5))
            .expect("process exit was not reported")
            .expect("process exit was treated as a manual close");
        assert_eq!(exit.code, Some(0));
        let output = output_receiver
            .recv_timeout(Duration::from_secs(5))
            .expect("ConPTY output remained open after process exit")
            .unwrap();
        assert!(String::from_utf8_lossy(&output).contains("abergin-final-output"));
        assert!(sessions.lock().is_empty());
    }
}
