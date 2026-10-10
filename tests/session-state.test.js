import test from "node:test";
import assert from "node:assert/strict";
import { serializeRestorableNode } from "../src/session-state.js";

const leaf = (name, exited = false) => ({
  type: "leaf",
  leaf: { profile: { name }, exited, closed: false, closing: false },
});
const split = (a, b) => ({ type: "split", dir: "row", sizes: [1, 2], a, b });
const save = (root, activeLeaf) => serializeRestorableNode(root, activeLeaf, (profile) => profile);

test("does not restore an exited pane and collapses its split", () => {
  const running = leaf("PowerShell");
  const exited = leaf("SSH", true);
  const result = save(split(exited, running), running.leaf);
  assert.deepEqual(result, {
    layout: { type: "leaf", profile: { name: "PowerShell" } },
    activePane: "",
  });
});

test("preserves the active pane path after pruning a nested split", () => {
  const first = leaf("PowerShell");
  const second = leaf("Git Bash");
  const exited = leaf("SSH", true);
  const result = save(split(first, split(exited, second)), second.leaf);
  assert.equal(result.activePane, "b");
  assert.equal(result.layout.b.profile.name, "Git Bash");
});

test("does not save a tab whose sessions have all exited", () => {
  assert.equal(save(split(leaf("SSH", true), leaf("CMD", true)), null), null);
});
