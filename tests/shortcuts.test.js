import test from "node:test";
import assert from "node:assert/strict";
import { shortcutKey } from "../src/shortcuts.js";

test("Ctrl+Shift+F works with a Cyrillic keyboard layout", () => {
  assert.equal(shortcutKey({ key: "а", code: "KeyF" }), "f");
});

test("Latin layouts keep the typed shortcut letter", () => {
  assert.equal(shortcutKey({ key: "w", code: "KeyZ" }), "w");
});

test("non-letter shortcuts keep their key names", () => {
  assert.equal(shortcutKey({ key: "ArrowLeft", code: "ArrowLeft" }), "arrowleft");
});
