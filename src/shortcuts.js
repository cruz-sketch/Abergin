// Keep letter shortcuts usable when the active keyboard layout uses another
// alphabet. Prefer the typed Latin letter (for layouts such as AZERTY), then
// use the physical key for Cyrillic and other non-Latin layouts.
export function shortcutKey(event) {
  const typed = String(event.key ?? "").toLowerCase();
  if (/^[a-z]$/.test(typed)) return typed;
  const physical = /^Key([A-Z])$/.exec(event.code ?? "");
  return physical ? physical[1].toLowerCase() : typed;
}
