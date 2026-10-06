# Abergin privacy policy

Last updated: 6 October 2026

Abergin is a local terminal application for Windows. It does not include
analytics, advertising, or an account system. The developer does not collect
terminal input, output, usage data, or crash reports through the app.

Abergin saves preferences, open tab layouts, working directories, and saved SSH
connection details on your device so they can be restored later. SSH connection
details can include a host, username, port, and path to a private key. Abergin
does not upload this saved data to a developer-operated server.

When you initiate an SSH connection, the Windows OpenSSH client communicates
with the remote host you selected. Information you send through that session is
subject to the practices of that host. Clipboard access occurs only when you
use copy or paste features. Abergin does not monitor the clipboard in the
background.

You can remove saved data by deleting Abergin's app data through Windows. The
standalone installation uses `%APPDATA%\com.abergin.terminal`; the Store build
uses `%APPDATA%\com.abergin.terminal.store` (Windows may place packaged app data
in its private per-app location). Removing this data also removes saved SSH
connections and tab history.

For privacy questions, open an issue at
<https://github.com/cruz-sketch/Abergin/issues>.
