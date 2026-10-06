import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { cwdFromCmdOsc, cwdFromOsc7, cwdFromWslOsc, restoreProfile, serializeProfile, sessionArgs, sshProfile } from "../src/session-profile.js";

const local = {
  name: "PowerShell",
  shell: "C:\\Windows\\powershell.exe",
  args: ["-NoLogo"],
  cwd: null,
  color: "#7aa2f7",
};

test("restores an Explorer tab in its original directory", () => {
  const saved = serializeProfile({ ...local, cwd: "C:\\Projects\\alpha" });
  const updated = { ...local, args: ["-NoLogo", "-NoProfile"] };
  const restored = restoreProfile(saved, [updated], [], "ssh", updated);
  assert.equal(restored.cwd, "C:\\Projects\\alpha");
  assert.deepEqual(restored.args, updated.args);
});

test("restores a WSL tab in its Linux directory", () => {
  const wsl = { name: "WSL", shell: "C:\\Windows\\System32\\wsl.exe", args: [], cwd: null };
  const saved = serializeProfile({ ...wsl, cwd: "/home/alice/project" });
  assert.equal(restoreProfile(saved, [wsl], [], "ssh", wsl).cwd, "/home/alice/project");
});

test("restores an SSH pane with the current SSH executable", () => {
  const connection = { name: "server", host: "example.org", user: "alice", port: "2222", key: "C:\\Keys\\id" };
  const saved = serializeProfile(sshProfile(connection, "old-ssh.exe"));
  const restored = restoreProfile(saved, [local], [], "new-ssh.exe", local);
  assert.equal(restored.shell, "new-ssh.exe");
  assert.deepEqual(restored.args, ["-p", "2222", "-i", "C:\\Keys\\id", "--", "alice@example.org"]);
});

test("migrates old SSH tabs saved only by name", () => {
  const connection = { name: "server", host: "example.org", user: "alice", port: "22", key: "" };
  const restored = restoreProfile("server", [local], [connection], "ssh.exe", local);
  assert.equal(restored.kind, "ssh");
  assert.equal(restored.name, "server");
});

test("tracks a PowerShell directory report without changing saved profile args", () => {
  const profile = { ...local, args: ["-NoExit", "-Command", "try { Set-PSReadLineOption -EditMode Emacs } catch {}"] };
  const launched = sessionArgs(profile);
  assert.match(launched[2], /__aberginOriginalPrompt/);
  assert.equal(profile.args[2], "try { Set-PSReadLineOption -EditMode Emacs } catch {}");
  assert.match(sessionArgs(local).at(-1), /__aberginOriginalPrompt/);
  assert.equal(cwdFromOsc7("file:///C:/Projects/My%20App"), "C:\\Projects\\My App");
  assert.equal(cwdFromOsc7("file:///c/Projects/My%20App"), "c:\\Projects\\My App");
  assert.equal(cwdFromOsc7("file://server/share/My%20App"), "\\\\server\\share\\My App");
  assert.equal(cwdFromOsc7("file:///home/alice"), null);
  assert.equal(cwdFromOsc7("file:///home/alice/My%20App", true), "/home/alice/My App");
  assert.equal(cwdFromCmdOsc("abergin;cwd;C:\\Projects\\My App"), "C:\\Projects\\My App");
  assert.equal(cwdFromWslOsc("abergin;wsl;/home/alice/My App"), "/home/alice/My App");
});

test("PowerShell prompt integration emits OSC 7", { skip: process.platform !== "win32" }, () => {
  const setup = sessionArgs({ shell: "powershell.exe", args: ["-Command", ""] })[1];
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-Command", `${setup}; prompt`], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\x1b\]7;file:\/\/\/[A-Za-z]:\//);
});
