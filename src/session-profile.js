// Persist enough information to recreate a pane even when it was opened from
// Explorer or from an SSH connection rather than from config.profiles.
const POWERSHELL_CWD_SETUP = String.raw`$global:__aberginOriginalPrompt = (Get-Command prompt -CommandType Function).ScriptBlock; function global:prompt { try { $uri = [Uri]::new((Get-Location).ProviderPath).AbsoluteUri; [Console]::Write(([char]27).ToString() + ']7;' + $uri + ([char]7)) } catch {}; & $global:__aberginOriginalPrompt }`;

export function sessionArgs(profile) {
  const args = Array.isArray(profile.args) ? [...profile.args] : [];
  if (!/(?:^|[\\/])(powershell|pwsh)(?:\.exe)?$/i.test(profile.shell)) return args;
  const command = args.findIndex((arg) => /^-(?:command|c)$/i.test(arg));
  if (command >= 0) {
    args[command + 1] = typeof args[command + 1] === "string"
      ? `${args[command + 1]}; ${POWERSHELL_CWD_SETUP}`
      : POWERSHELL_CWD_SETUP;
  } else if (!args.some((arg) => /^-(?:file|f|encodedcommand|enc)$/i.test(arg))) {
    if (!args.some((arg) => /^-noexit$/i.test(arg))) args.push("-NoExit");
    args.push("-Command", POWERSHELL_CWD_SETUP);
  }
  return args;
}

export function cwdFromOsc7(data, wsl = false) {
  try {
    const uri = new URL(data);
    if (uri.protocol !== "file:") return null;
    const path = decodeURIComponent(uri.pathname);
    if (wsl) return !uri.hostname || uri.hostname === "localhost" ? path : null;
    if (/^\/[a-z]:\//i.test(path)) return path.slice(1).replace(/\//g, "\\");
    if (/^\/[a-z]\//i.test(path)) return `${path[1]}:${path.slice(2)}`.replace(/\//g, "\\");
    if (uri.hostname && uri.hostname !== "localhost") {
      return `\\\\${uri.hostname}${path.replace(/\//g, "\\")}`;
    }
  } catch {}
  return null;
}

export function cwdFromCmdOsc(data) {
  const prefix = "abergin;cwd;";
  if (!data.startsWith(prefix)) return null;
  const path = data.slice(prefix.length);
  return /^[a-z]:\\/i.test(path) || /^\\\\[^\\]+\\[^\\]+/.test(path) ? path : null;
}

export function cwdFromWslOsc(data) {
  const prefix = "abergin;wsl;";
  if (!data.startsWith(prefix)) return null;
  const path = data.slice(prefix.length);
  return path.startsWith("/") ? path : null;
}

export function sshProfile(connection, sshPath) {
  const target = connection.user
    ? `${connection.user}@${connection.host}`
    : connection.host;
  const args = [];
  if (connection.port && String(connection.port) !== "22") {
    args.push("-p", String(connection.port));
  }
  if (connection.key) args.push("-i", connection.key);
  args.push("--", target);
  return {
    kind: "ssh",
    connection: { ...connection },
    name: connection.name || target,
    shell: sshPath,
    args,
    cwd: null,
    color: "#bb9af7",
  };
}

export function serializeProfile(profile) {
  if (profile.kind === "ssh" && profile.connection) {
    return { kind: "ssh", connection: { ...profile.connection } };
  }
  return {
    kind: "local",
    name: profile.name,
    shell: profile.shell,
    args: Array.isArray(profile.args) ? [...profile.args] : [],
    cwd: profile.cwd ?? null,
    color: profile.color ?? null,
  };
}

export function restoreProfile(saved, profiles, connections, sshPath, fallback) {
  if (saved && typeof saved === "object") {
    if (saved.kind === "ssh" && saved.connection?.host) {
      return sshProfile(saved.connection, sshPath);
    }
    if (typeof saved.name === "string") {
      const current = profiles.find((profile) => profile.name === saved.name);
      if (current) {
        return {
          ...current,
          cwd: typeof saved.cwd === "string" ? saved.cwd : current.cwd ?? null,
        };
      }
      if (typeof saved.shell === "string" && saved.shell) {
        return {
          name: saved.name,
          shell: saved.shell,
          args: Array.isArray(saved.args) ? saved.args.filter((arg) => typeof arg === "string") : [],
          cwd: typeof saved.cwd === "string" ? saved.cwd : null,
          color: typeof saved.color === "string" ? saved.color : undefined,
        };
      }
    }
  }
  if (typeof saved === "string") {
    const current = profiles.find((profile) => profile.name === saved);
    if (current) return current;
    const connection = connections.find(
      (conn) => (conn.name || (conn.user ? `${conn.user}@${conn.host}` : conn.host)) === saved,
    );
    if (connection) return sshProfile(connection, sshPath);
  }
  return fallback;
}
