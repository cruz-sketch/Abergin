//! Windows Explorer "Open in Abergin" integration + launch-directory plumbing.
//!
//! Two parts:
//!  * Registry helpers that add/remove a context-menu entry under
//!    `HKCU\Software\Classes\…` (per-user, so no admin rights are needed).
//!    These are excluded from the Store build because packaged registry writes
//!    are not a reliable way to register Explorer commands.
//!  * `LaunchState`, which captures the directory Explorer passed on the command
//!    line (`"%V"`) so the frontend can open a tab there on startup.

use parking_lot::Mutex;
use std::path::Path;

#[cfg(all(windows, not(feature = "store")))]
use winreg::enums::HKEY_CURRENT_USER;
#[cfg(all(windows, not(feature = "store")))]
use winreg::RegKey;

/// Directory captured from argv at startup, consumed once by the frontend.
#[derive(Default)]
pub struct LaunchState {
    pub cwd: Mutex<Option<String>>,
}

impl LaunchState {
    pub fn from_args() -> Self {
        LaunchState {
            cwd: Mutex::new(dir_from_args(std::env::args())),
        }
    }
}

/// First argument that is an existing directory. Explorer launches us with the
/// folder path (via the `"%V"` placeholder); a stray flag or file is ignored.
pub fn dir_from_args<I: IntoIterator<Item = String>>(args: I) -> Option<String> {
    args.into_iter()
        .skip(1)
        .find(|a| Path::new(a).is_dir())
        .map(|a| {
            std::fs::canonicalize(&a)
                .ok()
                .and_then(|p| p.to_str().map(strip_unc))
                .unwrap_or(a)
        })
}

/// `canonicalize` yields a verbatim `\\?\C:\…` path; strip the prefix so the
/// shell (and a human reading the tab title) gets a plain path.
#[cfg(windows)]
fn strip_unc(p: &str) -> String {
    if let Some(rest) = p.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{rest}")
    } else {
        p.strip_prefix(r"\\?\").unwrap_or(p).to_string()
    }
}
#[cfg(not(windows))]
fn strip_unc(p: &str) -> String {
    p.to_string()
}

/// Hand the captured launch directory to the frontend, clearing it so a later
/// `take` (e.g. an accidental second call) does not re-open the tab.
#[tauri::command]
pub fn take_launch_cwd(state: tauri::State<'_, LaunchState>) -> Option<String> {
    state.cwd.lock().take()
}

// ---------------------------------------------------------------------------
// Explorer context-menu registration (HKCU — per user, no elevation)
// ---------------------------------------------------------------------------

#[cfg(all(windows, not(feature = "store")))]
const ROOTS: [&str; 3] = [
    // Right-click a folder.
    r"Software\Classes\Directory\shell\Abergin",
    // Right-click empty space inside an open folder.
    r"Software\Classes\Directory\Background\shell\Abergin",
    // Right-click a drive root.
    r"Software\Classes\Drive\shell\Abergin",
];

#[cfg(all(windows, not(feature = "store")))]
fn exe_path() -> Result<String, String> {
    std::env::current_exe()
        .map_err(|e| e.to_string())?
        .to_str()
        .map(str::to_string)
        .ok_or_else(|| "executable path is not valid UTF-8".into())
}

#[tauri::command]
#[cfg(all(windows, not(feature = "store")))]
pub fn set_explorer_integration(enabled: bool, label: Option<String>) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if enabled {
        let exe = exe_path()?;
        let label = label
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("Open in Abergin");
        let command = format!("\"{}\" \"%V\"", exe);
        for base in ROOTS {
            let (key, _) = hkcu.create_subkey(base).map_err(|e| e.to_string())?;
            key.set_value("", &label).map_err(|e| e.to_string())?;
            // Show the app icon next to the entry.
            key.set_value("Icon", &exe).map_err(|e| e.to_string())?;
            let (cmd, _) = key.create_subkey("command").map_err(|e| e.to_string())?;
            cmd.set_value("", &command).map_err(|e| e.to_string())?;
        }
    } else {
        for base in ROOTS {
            match hkcu.delete_subkey_all(base) {
                Ok(()) => {}
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
                Err(e) => return Err(e.to_string()),
            }
        }
    }
    Ok(())
}

#[tauri::command]
#[cfg(all(windows, not(feature = "store")))]
pub fn get_explorer_integration() -> bool {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(ROOTS[0])
        .is_ok()
}

// Non-Windows stubs so the crate still type-checks off-Windows.
#[tauri::command]
#[cfg(any(not(windows), feature = "store"))]
pub fn set_explorer_integration(_enabled: bool, _label: Option<String>) -> Result<(), String> {
    Err("Explorer integration is unavailable in this build".into())
}

#[tauri::command]
#[cfg(any(not(windows), feature = "store"))]
pub fn get_explorer_integration() -> bool {
    false
}

#[tauri::command]
pub fn explorer_integration_available() -> bool {
    cfg!(all(windows, not(feature = "store")))
}

#[cfg(test)]
mod tests {
    use super::strip_unc;

    #[test]
    #[cfg(feature = "store")]
    fn store_build_never_registers_explorer_commands() {
        assert!(!super::explorer_integration_available());
        assert!(!super::get_explorer_integration());
        assert!(super::set_explorer_integration(true, None).is_err());
    }

    #[test]
    #[cfg(windows)]
    fn converts_verbatim_local_and_network_paths() {
        assert_eq!(
            strip_unc(r"\\?\C:\Projects\Abergin"),
            r"C:\Projects\Abergin"
        );
        assert_eq!(
            strip_unc(r"\\?\UNC\server\share\folder"),
            r"\\server\share\folder"
        );
    }
}
