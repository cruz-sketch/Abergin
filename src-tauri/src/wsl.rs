#[cfg(windows)]
mod windows {
    use std::io::Read;
    use std::process::{Command, ExitStatus, Stdio};
    use std::sync::mpsc;
    use std::time::{Duration, Instant};

    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    fn registered_distributions() -> Vec<String> {
        let root = RegKey::predef(HKEY_CURRENT_USER);
        let Ok(key) = root.open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Lxss") else {
            return Vec::new();
        };
        key.enum_keys()
            .flatten()
            .filter_map(|subkey| key.open_subkey(subkey).ok())
            .filter_map(|subkey: RegKey| subkey.get_value::<String, _>("DistributionName").ok())
            .filter(|name| !name.trim().is_empty())
            .collect()
    }

    fn decode_output(bytes: &[u8]) -> String {
        // Inbox wsl.exe writes UTF-16LE when redirected; Store WSL may use UTF-8.
        let mut text = String::from_utf8_lossy(bytes).into_owned();
        text.push('\n');
        let words = bytes
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect::<Vec<_>>();
        text.push_str(&String::from_utf16_lossy(&words));
        text
    }

    fn run_query(shell: &str, args: &[&str]) -> Option<(ExitStatus, String)> {
        let mut child = Command::new(shell)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .ok()?;
        let stdout = child.stdout.take()?;
        let stderr = child.stderr.take()?;
        let (sender, receiver) = mpsc::channel();
        let stdout_sender = sender.clone();
        std::thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = stdout.take(128 * 1024).read_to_end(&mut bytes);
            let _ = stdout_sender.send(bytes);
        });
        std::thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = stderr.take(128 * 1024).read_to_end(&mut bytes);
            let _ = sender.send(bytes);
        });
        let deadline = Instant::now() + Duration::from_secs(3);
        let status = loop {
            match child.try_wait() {
                Ok(Some(status)) => break Some(status),
                Ok(None) if Instant::now() < deadline => {
                    std::thread::sleep(Duration::from_millis(50));
                }
                _ => {
                    let _ = child.kill();
                    let _ = child.wait();
                    break None;
                }
            }
        };
        let status = status?;
        let remaining = deadline.saturating_duration_since(Instant::now());
        let first = receiver.recv_timeout(remaining).ok()?;
        let remaining = deadline.saturating_duration_since(Instant::now());
        let second = receiver.recv_timeout(remaining).ok()?;
        Some((
            status,
            format!("{}{}", decode_output(&first), decode_output(&second)),
        ))
    }

    fn lists_registered_distribution(output: &str, distributions: &[String]) -> bool {
        output.lines().any(|line| {
            let name =
                line.trim_matches(|c: char| c.is_whitespace() || c == '\0' || c == '\u{feff}');
            distributions
                .iter()
                .any(|distro| name.eq_ignore_ascii_case(distro))
        })
    }

    pub fn is_ready(shell: &str) -> bool {
        let distributions = registered_distributions();
        if distributions.is_empty() {
            return false;
        }
        let Some((status, output)) = run_query(shell, &["--list", "--quiet"]) else {
            return false;
        };
        status.success() && lists_registered_distribution(&output, &distributions)
    }

    pub fn supports_cd(shell: &str) -> bool {
        run_query(shell, &["--help"]).is_some_and(|(_, output)| output.contains("--cd"))
    }

    #[cfg(test)]
    mod tests {
        use super::{decode_output, lists_registered_distribution};

        #[test]
        fn decodes_utf8_and_utf16_wsl_output() {
            assert!(decode_output(b"Ubuntu\r\n").contains("Ubuntu"));
            let utf16 = "Ubuntu\r\n"
                .encode_utf16()
                .flat_map(u16::to_le_bytes)
                .collect::<Vec<_>>();
            assert!(decode_output(&utf16).contains("Ubuntu"));
        }

        #[test]
        fn rejects_wsl_usage_text_without_an_installed_distribution() {
            let distributions = vec!["Ubuntu".to_string()];
            assert!(!lists_registered_distribution(
                "Usage: wsl.exe [Argument]\r\n--install Ubuntu\r\n",
                &distributions
            ));
            let utf16 = "\u{feff}Ubuntu\r\n"
                .encode_utf16()
                .flat_map(u16::to_le_bytes)
                .collect::<Vec<_>>();
            assert!(lists_registered_distribution(
                &decode_output(&utf16),
                &distributions
            ));
        }
    }
}

#[cfg(windows)]
pub use windows::{is_ready, supports_cd};

#[cfg(not(windows))]
pub fn is_ready(_shell: &str) -> bool {
    false
}

#[cfg(not(windows))]
pub fn supports_cd(_shell: &str) -> bool {
    false
}
