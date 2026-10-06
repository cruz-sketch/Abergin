import "@xterm/xterm/css/xterm.css";
import "./style.css";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import pkg from "../package.json";
import { cwdFromCmdOsc, cwdFromOsc7, cwdFromWslOsc, restoreProfile, serializeProfile, sessionArgs, sshProfile } from "./session-profile.js";
import { shortcutKey } from "./shortcuts.js";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  writeText as clipboardWrite,
  readText as clipboardRead,
} from "@tauri-apps/plugin-clipboard-manager";

const appWindow = getCurrentWindow();

// ---------------------------------------------------------------------------
// Localization (i18n). The chosen locale is persisted in state.json; first
// launch follows the OS language and falls back to English.
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { code: "uk", label: "Українська" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pl", label: "Polski" },
  { code: "cs", label: "Čeština" },
  { code: "lt", label: "Lietuvių" },
  { code: "lv", label: "Latviešu" },
  { code: "et", label: "Eesti" },
  { code: "no", label: "Norsk" },
  { code: "ro", label: "Română (Moldova)" },
  { code: "az", label: "Azərbaycan" },
  { code: "ja", label: "日本語" },
];

const I18N = {
  uk: {
    rename: "Перейменувати",
    duplicate: "Дублювати",
    closeTab: "Закрити вкладку",
    copy: "Копіювати",
    paste: "Вставити",
    selectAll: "Виділити все",
    splitRight: "Розділити праворуч",
    splitDown: "Розділити вниз",
    closePane: "Закрити панель",
    language: "Мова",
    help: "Довідка",
    hIntro:
      "Стильний нативний термінал для Windows. Профілі, вкладки, split-панелі, SSH, історія команд і bash-комбінації.",
    hgTabs: "Вкладки",
    hgPanes: "Панелі",
    hgEdit: "Редагування",
    hNewTab: "Нова вкладка",
    hClosePane: "Закрити панель / вкладку",
    hSwitchTab: "Перемкнути вкладку",
    hJumpTab: "Перейти на N-ту вкладку",
    hMouseDbl: "Подвійний клік по вкладці",
    hRename: "Перейменувати вкладку",
    hMouseDrag: "Перетягнути вкладку",
    hReorder: "Змінити порядок вкладок",
    hFocusPane: "Перейти між панелями",
    hMouseClick: "Клік по панелі",
    hFocusClick: "Зробити панель активною",
    hMouseSplitter: "Тягнути роздільник",
    hResize: "Змінити розмір панелей",
    hSelect: "Виділення мишею",
    hSelectCopy: "Копіювати виділене",
    hMiddle: "Середня кнопка миші",
    hBash: "Bash-комбінації (видалити слово, на початок рядка, пошук в історії…)",
    theme: "Тема",
    hgView: "Вигляд",
    hZoom: "Збільшити / зменшити текст",
    hZoomReset: "Скинути масштаб",
    hWheel: "Масштабувати текст",
    sshSection: "SSH-ПІДКЛЮЧЕННЯ",
    addSsh: "Додати SSH-підключення",
    delete: "Видалити",
    editConfig: "Редагувати config.json",
    shellIntegration: "Контекстне меню Провідника",
    langSection: "МОВА",
    sshTitle: "Нове SSH-підключення",
    fName: "Назва",
    fHost: "Хост",
    fUser: "Користувач",
    fPort: "Порт",
    fKey: "Ключ (необов'язково)",
    cancel: "Скасувати",
    save: "Зберегти",
    phName: "Мій сервер",
    phHost: "192.168.0.10 або example.com",
    processExited: "процес завершено",
    tipNewTab: "Нова вкладка (Ctrl+Shift+T)",
    tipMenu: "Меню",
    tipMin: "Згорнути",
    tipMax: "Розгорнути",
    tipClose: "Закрити",
  },
  en: {
    rename: "Rename",
    duplicate: "Duplicate",
    closeTab: "Close tab",
    copy: "Copy",
    paste: "Paste",
    selectAll: "Select all",
    splitRight: "Split right",
    splitDown: "Split down",
    closePane: "Close pane",
    language: "Language",
    help: "Help",
    hIntro:
      "A stylish, native terminal for Windows. Profiles, tabs, split panes, SSH, command history and bash keybindings.",
    hgTabs: "Tabs",
    hgPanes: "Panes",
    hgEdit: "Editing",
    hNewTab: "New tab",
    hClosePane: "Close pane / tab",
    hSwitchTab: "Switch tab",
    hJumpTab: "Jump to Nth tab",
    hMouseDbl: "Double-click a tab",
    hRename: "Rename tab",
    hMouseDrag: "Drag a tab",
    hReorder: "Reorder tabs",
    hFocusPane: "Move focus between panes",
    hMouseClick: "Click a pane",
    hFocusClick: "Focus that pane",
    hMouseSplitter: "Drag the splitter",
    hResize: "Resize panes",
    hSelect: "Select with mouse",
    hSelectCopy: "Copy selection",
    hMiddle: "Middle mouse button",
    hBash: "Bash keybindings (delete word, line start, history search…)",
    theme: "Theme",
    hgView: "View",
    hZoom: "Zoom text in / out",
    hZoomReset: "Reset zoom",
    hWheel: "Zoom text",
    sshSection: "SSH CONNECTIONS",
    addSsh: "Add SSH connection",
    delete: "Delete",
    editConfig: "Edit config.json",
    shellIntegration: "Explorer context menu",
    langSection: "LANGUAGE",
    sshTitle: "New SSH connection",
    fName: "Name",
    fHost: "Host",
    fUser: "User",
    fPort: "Port",
    fKey: "Key (optional)",
    cancel: "Cancel",
    save: "Save",
    phName: "My server",
    phHost: "192.168.0.10 or example.com",
    processExited: "process exited",
    tipNewTab: "New tab (Ctrl+Shift+T)",
    tipMenu: "Menu",
    tipMin: "Minimize",
    tipMax: "Maximize",
    tipClose: "Close",
  },
  de: {
    rename: "Umbenennen",
    duplicate: "Duplizieren",
    closeTab: "Tab schließen",
    copy: "Kopieren",
    paste: "Einfügen",
    selectAll: "Alles auswählen",
    splitRight: "Rechts teilen",
    splitDown: "Nach unten teilen",
    closePane: "Bereich schließen",
    language: "Sprache",
    help: "Hilfe",
    hIntro:
      "Ein stilvolles, natives Terminal für Windows. Profile, Tabs, geteilte Bereiche, SSH, Befehlsverlauf und Bash-Tastenkürzel.",
    hgTabs: "Tabs",
    hgPanes: "Bereiche",
    hgEdit: "Bearbeiten",
    hNewTab: "Neuer Tab",
    hClosePane: "Bereich / Tab schließen",
    hSwitchTab: "Tab wechseln",
    hJumpTab: "Zum N-ten Tab springen",
    hMouseDbl: "Doppelklick auf Tab",
    hRename: "Tab umbenennen",
    hMouseDrag: "Tab ziehen",
    hReorder: "Tabs neu anordnen",
    hFocusPane: "Fokus zwischen Bereichen",
    hMouseClick: "Klick auf Bereich",
    hFocusClick: "Bereich fokussieren",
    hMouseSplitter: "Trenner ziehen",
    hResize: "Bereichsgröße ändern",
    hSelect: "Mit Maus auswählen",
    hSelectCopy: "Auswahl kopieren",
    hMiddle: "Mittlere Maustaste",
    hBash: "Bash-Tastenkürzel (Wort löschen, Zeilenanfang, Verlaufssuche…)",
    theme: "Thema",
    hgView: "Ansicht",
    hZoom: "Text vergrößern / verkleinern",
    hZoomReset: "Zoom zurücksetzen",
    hWheel: "Text zoomen",
    sshSection: "SSH-VERBINDUNGEN",
    addSsh: "SSH-Verbindung hinzufügen",
    delete: "Löschen",
    editConfig: "config.json bearbeiten",
    langSection: "SPRACHE",
    sshTitle: "Neue SSH-Verbindung",
    fName: "Name",
    fHost: "Host",
    fUser: "Benutzer",
    fPort: "Port",
    fKey: "Schlüssel (optional)",
    cancel: "Abbrechen",
    save: "Speichern",
    phName: "Mein Server",
    phHost: "192.168.0.10 oder example.com",
    processExited: "Prozess beendet",
    tipNewTab: "Neuer Tab (Ctrl+Shift+T)",
    tipMenu: "Menü",
    tipMin: "Minimieren",
    tipMax: "Maximieren",
    tipClose: "Schließen",
  },
  fr: {
    rename: "Renommer",
    duplicate: "Dupliquer",
    closeTab: "Fermer l'onglet",
    copy: "Copier",
    paste: "Coller",
    selectAll: "Tout sélectionner",
    splitRight: "Diviser à droite",
    splitDown: "Diviser vers le bas",
    closePane: "Fermer le volet",
    language: "Langue",
    help: "Aide",
    hIntro:
      "Un terminal natif et élégant pour Windows. Profils, onglets, volets divisés, SSH, historique et raccourcis bash.",
    hgTabs: "Onglets",
    hgPanes: "Volets",
    hgEdit: "Édition",
    hNewTab: "Nouvel onglet",
    hClosePane: "Fermer le volet / l'onglet",
    hSwitchTab: "Changer d'onglet",
    hJumpTab: "Aller au N-ième onglet",
    hMouseDbl: "Double-clic sur un onglet",
    hRename: "Renommer l'onglet",
    hMouseDrag: "Glisser un onglet",
    hReorder: "Réordonner les onglets",
    hFocusPane: "Déplacer le focus entre volets",
    hMouseClick: "Clic sur un volet",
    hFocusClick: "Activer ce volet",
    hMouseSplitter: "Glisser la séparation",
    hResize: "Redimensionner les volets",
    hSelect: "Sélection à la souris",
    hSelectCopy: "Copier la sélection",
    hMiddle: "Bouton central de la souris",
    hBash: "Raccourcis bash (supprimer un mot, début de ligne, recherche historique…)",
    theme: "Thème",
    hgView: "Affichage",
    hZoom: "Agrandir / réduire le texte",
    hZoomReset: "Réinitialiser le zoom",
    hWheel: "Zoomer le texte",
    sshSection: "CONNEXIONS SSH",
    addSsh: "Ajouter une connexion SSH",
    delete: "Supprimer",
    editConfig: "Modifier config.json",
    langSection: "LANGUE",
    sshTitle: "Nouvelle connexion SSH",
    fName: "Nom",
    fHost: "Hôte",
    fUser: "Utilisateur",
    fPort: "Port",
    fKey: "Clé (facultatif)",
    cancel: "Annuler",
    save: "Enregistrer",
    phName: "Mon serveur",
    phHost: "192.168.0.10 ou example.com",
    processExited: "processus terminé",
    tipNewTab: "Nouvel onglet (Ctrl+Shift+T)",
    tipMenu: "Menu",
    tipMin: "Réduire",
    tipMax: "Agrandir",
    tipClose: "Fermer",
  },
  es: {
    rename: "Renombrar",
    duplicate: "Duplicar",
    closeTab: "Cerrar pestaña",
    copy: "Copiar",
    paste: "Pegar",
    selectAll: "Seleccionar todo",
    splitRight: "Dividir a la derecha",
    splitDown: "Dividir abajo",
    closePane: "Cerrar panel",
    language: "Idioma",
    help: "Ayuda",
    hIntro:
      "Una terminal nativa y elegante para Windows. Perfiles, pestañas, paneles divididos, SSH, historial y atajos de bash.",
    hgTabs: "Pestañas",
    hgPanes: "Paneles",
    hgEdit: "Edición",
    hNewTab: "Nueva pestaña",
    hClosePane: "Cerrar panel / pestaña",
    hSwitchTab: "Cambiar de pestaña",
    hJumpTab: "Ir a la pestaña N",
    hMouseDbl: "Doble clic en una pestaña",
    hRename: "Renombrar pestaña",
    hMouseDrag: "Arrastrar una pestaña",
    hReorder: "Reordenar pestañas",
    hFocusPane: "Mover el foco entre paneles",
    hMouseClick: "Clic en un panel",
    hFocusClick: "Activar ese panel",
    hMouseSplitter: "Arrastrar el divisor",
    hResize: "Redimensionar paneles",
    hSelect: "Seleccionar con el ratón",
    hSelectCopy: "Copiar selección",
    hMiddle: "Botón central del ratón",
    hBash: "Atajos de bash (borrar palabra, inicio de línea, búsqueda en historial…)",
    theme: "Tema",
    hgView: "Vista",
    hZoom: "Aumentar / reducir texto",
    hZoomReset: "Restablecer zoom",
    hWheel: "Zoom de texto",
    sshSection: "CONEXIONES SSH",
    addSsh: "Añadir conexión SSH",
    delete: "Eliminar",
    editConfig: "Editar config.json",
    langSection: "IDIOMA",
    sshTitle: "Nueva conexión SSH",
    fName: "Nombre",
    fHost: "Host",
    fUser: "Usuario",
    fPort: "Puerto",
    fKey: "Clave (opcional)",
    cancel: "Cancelar",
    save: "Guardar",
    phName: "Mi servidor",
    phHost: "192.168.0.10 o example.com",
    processExited: "proceso finalizado",
    tipNewTab: "Nueva pestaña (Ctrl+Shift+T)",
    tipMenu: "Menú",
    tipMin: "Minimizar",
    tipMax: "Maximizar",
    tipClose: "Cerrar",
  },
  pl: {
    rename: "Zmień nazwę",
    duplicate: "Duplikuj",
    closeTab: "Zamknij kartę",
    copy: "Kopiuj",
    paste: "Wklej",
    selectAll: "Zaznacz wszystko",
    splitRight: "Podziel w prawo",
    splitDown: "Podziel w dół",
    closePane: "Zamknij panel",
    language: "Język",
    help: "Pomoc",
    hIntro:
      "Stylowy, natywny terminal dla Windows. Profile, karty, podzielone panele, SSH, historia poleceń i skróty bash.",
    hgTabs: "Karty",
    hgPanes: "Panele",
    hgEdit: "Edycja",
    hNewTab: "Nowa karta",
    hClosePane: "Zamknij panel / kartę",
    hSwitchTab: "Przełącz kartę",
    hJumpTab: "Przejdź do N-tej karty",
    hMouseDbl: "Dwuklik na karcie",
    hRename: "Zmień nazwę karty",
    hMouseDrag: "Przeciągnij kartę",
    hReorder: "Zmień kolejność kart",
    hFocusPane: "Przenieś fokus między panelami",
    hMouseClick: "Kliknij panel",
    hFocusClick: "Aktywuj ten panel",
    hMouseSplitter: "Przeciągnij separator",
    hResize: "Zmień rozmiar paneli",
    hSelect: "Zaznacz myszą",
    hSelectCopy: "Kopiuj zaznaczenie",
    hMiddle: "Środkowy przycisk myszy",
    hBash: "Skróty bash (usuń słowo, początek wiersza, wyszukiwanie w historii…)",
    theme: "Motyw",
    hgView: "Widok",
    hZoom: "Powiększ / zmniejsz tekst",
    hZoomReset: "Resetuj powiększenie",
    hWheel: "Powiększ tekst",
    sshSection: "POŁĄCZENIA SSH",
    addSsh: "Dodaj połączenie SSH",
    delete: "Usuń",
    editConfig: "Edytuj config.json",
    sshTitle: "Nowe połączenie SSH",
    fName: "Nazwa",
    fHost: "Host",
    fUser: "Użytkownik",
    fPort: "Port",
    fKey: "Klucz (opcjonalnie)",
    cancel: "Anuluj",
    save: "Zapisz",
    phName: "Mój serwer",
    phHost: "192.168.0.10 lub example.com",
    processExited: "proces zakończony",
    tipNewTab: "Nowa karta (Ctrl+Shift+T)",
    tipMenu: "Menu",
    tipMin: "Minimalizuj",
    tipMax: "Maksymalizuj",
    tipClose: "Zamknij",
  },
  cs: {
    rename: "Přejmenovat",
    duplicate: "Duplikovat",
    closeTab: "Zavřít kartu",
    copy: "Kopírovat",
    paste: "Vložit",
    selectAll: "Vybrat vše",
    splitRight: "Rozdělit doprava",
    splitDown: "Rozdělit dolů",
    closePane: "Zavřít panel",
    language: "Jazyk",
    help: "Nápověda",
    hIntro:
      "Stylový, nativní terminál pro Windows. Profily, karty, rozdělené panely, SSH, historie příkazů a klávesové zkratky bash.",
    hgTabs: "Karty",
    hgPanes: "Panely",
    hgEdit: "Úpravy",
    hNewTab: "Nová karta",
    hClosePane: "Zavřít panel / kartu",
    hSwitchTab: "Přepnout kartu",
    hJumpTab: "Přejít na N-tou kartu",
    hMouseDbl: "Dvojklik na kartu",
    hRename: "Přejmenovat kartu",
    hMouseDrag: "Přetáhnout kartu",
    hReorder: "Změnit pořadí karet",
    hFocusPane: "Přesunout fokus mezi panely",
    hMouseClick: "Kliknout na panel",
    hFocusClick: "Aktivovat panel",
    hMouseSplitter: "Táhnout oddělovač",
    hResize: "Změnit velikost panelů",
    hSelect: "Výběr myší",
    hSelectCopy: "Kopírovat výběr",
    hMiddle: "Prostřední tlačítko myši",
    hBash: "Klávesové zkratky bash (smazat slovo, začátek řádku, hledání v historii…)",
    theme: "Motiv",
    hgView: "Zobrazení",
    hZoom: "Zvětšit / zmenšit text",
    hZoomReset: "Obnovit přiblížení",
    hWheel: "Přiblížit text",
    sshSection: "PŘIPOJENÍ SSH",
    addSsh: "Přidat připojení SSH",
    delete: "Odstranit",
    editConfig: "Upravit config.json",
    sshTitle: "Nové připojení SSH",
    fName: "Název",
    fHost: "Host",
    fUser: "Uživatel",
    fPort: "Port",
    fKey: "Klíč (volitelné)",
    cancel: "Zrušit",
    save: "Uložit",
    phName: "Můj server",
    phHost: "192.168.0.10 nebo example.com",
    processExited: "proces ukončen",
    tipNewTab: "Nová karta (Ctrl+Shift+T)",
    tipMenu: "Nabídka",
    tipMin: "Minimalizovat",
    tipMax: "Maximalizovat",
    tipClose: "Zavřít",
  },
  lt: {
    rename: "Pervadinti",
    duplicate: "Dubliuoti",
    closeTab: "Uždaryti kortelę",
    copy: "Kopijuoti",
    paste: "Įklijuoti",
    selectAll: "Pažymėti viską",
    splitRight: "Skaidyti dešinėn",
    splitDown: "Skaidyti žemyn",
    closePane: "Uždaryti polangį",
    language: "Kalba",
    help: "Pagalba",
    hIntro:
      "Stilingas, natyvus terminalas Windows. Profiliai, kortelės, padalyti polangiai, SSH, komandų istorija ir bash spartieji klavišai.",
    hgTabs: "Kortelės",
    hgPanes: "Polangiai",
    hgEdit: "Redagavimas",
    hNewTab: "Nauja kortelė",
    hClosePane: "Uždaryti polangį / kortelę",
    hSwitchTab: "Perjungti kortelę",
    hJumpTab: "Pereiti į N-tą kortelę",
    hMouseDbl: "Dvigubas spustelėjimas ant kortelės",
    hRename: "Pervadinti kortelę",
    hMouseDrag: "Vilkti kortelę",
    hReorder: "Keisti kortelių tvarką",
    hFocusPane: "Perkelti fokusą tarp polangių",
    hMouseClick: "Spustelėti polangį",
    hFocusClick: "Aktyvinti polangį",
    hMouseSplitter: "Vilkti skirtuką",
    hResize: "Keisti polangių dydį",
    hSelect: "Žymėti pele",
    hSelectCopy: "Kopijuoti pažymėjimą",
    hMiddle: "Vidurinis pelės mygtukas",
    hBash: "Bash klavišai (trinti žodį, eilutės pradžia, paieška istorijoje…)",
    theme: "Tema",
    hgView: "Rodinys",
    hZoom: "Didinti / mažinti tekstą",
    hZoomReset: "Atstatyti mastelį",
    hWheel: "Keisti teksto mastelį",
    sshSection: "SSH RYŠIAI",
    addSsh: "Pridėti SSH ryšį",
    delete: "Ištrinti",
    editConfig: "Redaguoti config.json",
    sshTitle: "Naujas SSH ryšys",
    fName: "Pavadinimas",
    fHost: "Host",
    fUser: "Vartotojas",
    fPort: "Prievadas",
    fKey: "Raktas (nebūtina)",
    cancel: "Atšaukti",
    save: "Išsaugoti",
    phName: "Mano serveris",
    phHost: "192.168.0.10 arba example.com",
    processExited: "procesas baigtas",
    tipNewTab: "Nauja kortelė (Ctrl+Shift+T)",
    tipMenu: "Meniu",
    tipMin: "Sumažinti",
    tipMax: "Išskleisti",
    tipClose: "Uždaryti",
  },
  lv: {
    rename: "Pārdēvēt",
    duplicate: "Dublēt",
    closeTab: "Aizvērt cilni",
    copy: "Kopēt",
    paste: "Ielīmēt",
    selectAll: "Atlasīt visu",
    splitRight: "Sadalīt pa labi",
    splitDown: "Sadalīt uz leju",
    closePane: "Aizvērt rūti",
    language: "Valoda",
    help: "Palīdzība",
    hIntro:
      "Stilīgs, vietējais terminālis Windows. Profili, cilnes, sadalītas rūtis, SSH, komandu vēsture un bash īsinājumtaustiņi.",
    hgTabs: "Cilnes",
    hgPanes: "Rūtis",
    hgEdit: "Rediģēšana",
    hNewTab: "Jauna cilne",
    hClosePane: "Aizvērt rūti / cilni",
    hSwitchTab: "Pārslēgt cilni",
    hJumpTab: "Pāriet uz N-to cilni",
    hMouseDbl: "Dubultklikšķis uz cilnes",
    hRename: "Pārdēvēt cilni",
    hMouseDrag: "Vilkt cilni",
    hReorder: "Mainīt ciļņu secību",
    hFocusPane: "Pārvietot fokusu starp rūtīm",
    hMouseClick: "Noklikšķiniet uz rūts",
    hFocusClick: "Aktivizēt rūti",
    hMouseSplitter: "Vilkt atdalītāju",
    hResize: "Mainīt rūtu izmēru",
    hSelect: "Atlasīt ar peli",
    hSelectCopy: "Kopēt atlasi",
    hMiddle: "Vidējā peles poga",
    hBash: "Bash īsinājumtaustiņi (dzēst vārdu, rindas sākums, vēstures meklēšana…)",
    theme: "Motīvs",
    hgView: "Skats",
    hZoom: "Palielināt / samazināt tekstu",
    hZoomReset: "Atiestatīt mērogu",
    hWheel: "Mērogot tekstu",
    sshSection: "SSH SAVIENOJUMI",
    addSsh: "Pievienot SSH savienojumu",
    delete: "Dzēst",
    editConfig: "Rediģēt config.json",
    sshTitle: "Jauns SSH savienojums",
    fName: "Nosaukums",
    fHost: "Host",
    fUser: "Lietotājs",
    fPort: "Ports",
    fKey: "Atslēga (neobligāti)",
    cancel: "Atcelt",
    save: "Saglabāt",
    phName: "Mans serveris",
    phHost: "192.168.0.10 vai example.com",
    processExited: "process pabeigts",
    tipNewTab: "Jauna cilne (Ctrl+Shift+T)",
    tipMenu: "Izvēlne",
    tipMin: "Minimizēt",
    tipMax: "Maksimizēt",
    tipClose: "Aizvērt",
  },
  et: {
    rename: "Nimeta ümber",
    duplicate: "Dubleeri",
    closeTab: "Sulge kaart",
    copy: "Kopeeri",
    paste: "Kleebi",
    selectAll: "Vali kõik",
    splitRight: "Poolita paremale",
    splitDown: "Poolita alla",
    closePane: "Sulge paan",
    language: "Keel",
    help: "Abi",
    hIntro:
      "Stiilne, natiivne terminal Windowsile. Profiilid, kaardid, jagatud paanid, SSH, käskude ajalugu ja bash-kiirklahvid.",
    hgTabs: "Kaardid",
    hgPanes: "Paanid",
    hgEdit: "Redigeerimine",
    hNewTab: "Uus kaart",
    hClosePane: "Sulge paan / kaart",
    hSwitchTab: "Vaheta kaarti",
    hJumpTab: "Mine N-ndale kaardile",
    hMouseDbl: "Topeltklõps kaardil",
    hRename: "Nimeta kaart ümber",
    hMouseDrag: "Lohista kaarti",
    hReorder: "Muuda kaartide järjekorda",
    hFocusPane: "Liiguta fookust paanide vahel",
    hMouseClick: "Klõpsa paanil",
    hFocusClick: "Aktiveeri paan",
    hMouseSplitter: "Lohista eraldajat",
    hResize: "Muuda paanide suurust",
    hSelect: "Vali hiirega",
    hSelectCopy: "Kopeeri valik",
    hMiddle: "Hiire keskmine nupp",
    hBash: "Bash-kiirklahvid (kustuta sõna, rea algus, ajaloo otsing…)",
    theme: "Teema",
    hgView: "Vaade",
    hZoom: "Suurenda / vähenda teksti",
    hZoomReset: "Lähtesta suurendus",
    hWheel: "Suumi teksti",
    sshSection: "SSH-ÜHENDUSED",
    addSsh: "Lisa SSH-ühendus",
    delete: "Kustuta",
    editConfig: "Redigeeri config.json",
    sshTitle: "Uus SSH-ühendus",
    fName: "Nimi",
    fHost: "Host",
    fUser: "Kasutaja",
    fPort: "Port",
    fKey: "Võti (valikuline)",
    cancel: "Tühista",
    save: "Salvesta",
    phName: "Minu server",
    phHost: "192.168.0.10 või example.com",
    processExited: "protsess lõpetatud",
    tipNewTab: "Uus kaart (Ctrl+Shift+T)",
    tipMenu: "Menüü",
    tipMin: "Minimeeri",
    tipMax: "Maksimeeri",
    tipClose: "Sulge",
  },
  no: {
    rename: "Gi nytt navn",
    duplicate: "Dupliser",
    closeTab: "Lukk fane",
    copy: "Kopier",
    paste: "Lim inn",
    selectAll: "Merk alt",
    splitRight: "Del til høyre",
    splitDown: "Del nedover",
    closePane: "Lukk rute",
    language: "Språk",
    help: "Hjelp",
    hIntro:
      "En stilig, nativ terminal for Windows. Profiler, faner, delte ruter, SSH, kommandohistorikk og bash-snarveier.",
    hgTabs: "Faner",
    hgPanes: "Ruter",
    hgEdit: "Redigering",
    hNewTab: "Ny fane",
    hClosePane: "Lukk rute / fane",
    hSwitchTab: "Bytt fane",
    hJumpTab: "Gå til N-te fane",
    hMouseDbl: "Dobbeltklikk på en fane",
    hRename: "Gi fanen nytt navn",
    hMouseDrag: "Dra en fane",
    hReorder: "Endre rekkefølge på faner",
    hFocusPane: "Flytt fokus mellom ruter",
    hMouseClick: "Klikk på en rute",
    hFocusClick: "Fokuser ruten",
    hMouseSplitter: "Dra skilleren",
    hResize: "Endre størrelse på ruter",
    hSelect: "Merk med musen",
    hSelectCopy: "Kopier merket tekst",
    hMiddle: "Midtre museknapp",
    hBash: "Bash-snarveier (slett ord, linjestart, historikksøk…)",
    theme: "Tema",
    hgView: "Visning",
    hZoom: "Forstørr / forminsk tekst",
    hZoomReset: "Tilbakestill zoom",
    hWheel: "Zoom tekst",
    sshSection: "SSH-TILKOBLINGER",
    addSsh: "Legg til SSH-tilkobling",
    delete: "Slett",
    editConfig: "Rediger config.json",
    sshTitle: "Ny SSH-tilkobling",
    fName: "Navn",
    fHost: "Vert",
    fUser: "Bruker",
    fPort: "Port",
    fKey: "Nøkkel (valgfritt)",
    cancel: "Avbryt",
    save: "Lagre",
    phName: "Min server",
    phHost: "192.168.0.10 eller example.com",
    processExited: "prosess avsluttet",
    tipNewTab: "Ny fane (Ctrl+Shift+T)",
    tipMenu: "Meny",
    tipMin: "Minimer",
    tipMax: "Maksimer",
    tipClose: "Lukk",
  },
  ro: {
    rename: "Redenumește",
    duplicate: "Duplică",
    closeTab: "Închide fila",
    copy: "Copiază",
    paste: "Lipește",
    selectAll: "Selectează tot",
    splitRight: "Împarte la dreapta",
    splitDown: "Împarte în jos",
    closePane: "Închide panoul",
    language: "Limbă",
    help: "Ajutor",
    hIntro:
      "Un terminal nativ și elegant pentru Windows. Profiluri, file, panouri divizate, SSH, istoricul comenzilor și scurtături bash.",
    hgTabs: "File",
    hgPanes: "Panouri",
    hgEdit: "Editare",
    hNewTab: "Filă nouă",
    hClosePane: "Închide panoul / fila",
    hSwitchTab: "Schimbă fila",
    hJumpTab: "Mergi la fila N",
    hMouseDbl: "Dublu clic pe filă",
    hRename: "Redenumește fila",
    hMouseDrag: "Trage o filă",
    hReorder: "Reordonează filele",
    hFocusPane: "Mută focusul între panouri",
    hMouseClick: "Clic pe un panou",
    hFocusClick: "Activează panoul",
    hMouseSplitter: "Trage separatorul",
    hResize: "Redimensionează panourile",
    hSelect: "Selectează cu mouse-ul",
    hSelectCopy: "Copiază selecția",
    hMiddle: "Butonul din mijloc al mouse-ului",
    hBash: "Scurtături bash (șterge cuvânt, început de linie, căutare în istoric…)",
    theme: "Temă",
    hgView: "Vizualizare",
    hZoom: "Mărește / micșorează textul",
    hZoomReset: "Resetează zoomul",
    hWheel: "Zoom text",
    sshSection: "CONEXIUNI SSH",
    addSsh: "Adaugă o conexiune SSH",
    delete: "Șterge",
    editConfig: "Editează config.json",
    sshTitle: "Conexiune SSH nouă",
    fName: "Nume",
    fHost: "Gazdă",
    fUser: "Utilizator",
    fPort: "Port",
    fKey: "Cheie (opțional)",
    cancel: "Anulează",
    save: "Salvează",
    phName: "Serverul meu",
    phHost: "192.168.0.10 sau example.com",
    processExited: "proces încheiat",
    tipNewTab: "Filă nouă (Ctrl+Shift+T)",
    tipMenu: "Meniu",
    tipMin: "Minimizează",
    tipMax: "Maximizează",
    tipClose: "Închide",
  },
  az: {
    rename: "Adını dəyiş",
    duplicate: "Dublikat et",
    closeTab: "Tabı bağla",
    copy: "Kopyala",
    paste: "Yapışdır",
    selectAll: "Hamısını seç",
    splitRight: "Sağa böl",
    splitDown: "Aşağı böl",
    closePane: "Paneli bağla",
    language: "Dil",
    help: "Kömək",
    hIntro:
      "Windows üçün şık, doğma terminal. Profillər, tablar, bölünmüş panellər, SSH, əmr tarixçəsi və bash qısayolları.",
    hgTabs: "Tablar",
    hgPanes: "Panellər",
    hgEdit: "Redaktə",
    hNewTab: "Yeni tab",
    hClosePane: "Paneli / tabı bağla",
    hSwitchTab: "Tabı dəyiş",
    hJumpTab: "N-ci taba keç",
    hMouseDbl: "Tab üzərinə iki klik",
    hRename: "Tabın adını dəyiş",
    hMouseDrag: "Tabı sürüklə",
    hReorder: "Tabların sırasını dəyiş",
    hFocusPane: "Fokusu panellər arasında dəyiş",
    hMouseClick: "Panelə klik et",
    hFocusClick: "Paneli aktivləşdir",
    hMouseSplitter: "Ayırıcını sürüklə",
    hResize: "Panellərin ölçüsünü dəyiş",
    hSelect: "Siçanla seç",
    hSelectCopy: "Seçimi kopyala",
    hMiddle: "Siçanın orta düyməsi",
    hBash: "Bash qısayolları (sözü sil, sətrin əvvəli, tarixçədə axtarış…)",
    theme: "Tema",
    hgView: "Görünüş",
    hZoom: "Mətni böyüt / kiçilt",
    hZoomReset: "Miqyası sıfırla",
    hWheel: "Mətni miqyasla",
    sshSection: "SSH BAĞLANTILARI",
    addSsh: "SSH bağlantısı əlavə et",
    delete: "Sil",
    editConfig: "config.json redaktə et",
    sshTitle: "Yeni SSH bağlantısı",
    fName: "Ad",
    fHost: "Host",
    fUser: "İstifadəçi",
    fPort: "Port",
    fKey: "Açar (istəyə bağlı)",
    cancel: "Ləğv et",
    save: "Saxla",
    phName: "Mənim serverim",
    phHost: "192.168.0.10 və ya example.com",
    processExited: "proses bitdi",
    tipNewTab: "Yeni tab (Ctrl+Shift+T)",
    tipMenu: "Menyu",
    tipMin: "Kiçilt",
    tipMax: "Böyüt",
    tipClose: "Bağla",
  },
  ja: {
    rename: "名前を変更",
    duplicate: "複製",
    closeTab: "タブを閉じる",
    copy: "コピー",
    paste: "貼り付け",
    selectAll: "すべて選択",
    splitRight: "右に分割",
    splitDown: "下に分割",
    closePane: "ペインを閉じる",
    language: "言語",
    help: "ヘルプ",
    hIntro:
      "Windows 向けのスタイリッシュなネイティブターミナル。プロファイル、タブ、分割ペイン、SSH、コマンド履歴、bash キーバインド。",
    hgTabs: "タブ",
    hgPanes: "ペイン",
    hgEdit: "編集",
    hNewTab: "新しいタブ",
    hClosePane: "ペイン / タブを閉じる",
    hSwitchTab: "タブを切り替え",
    hJumpTab: "N 番目のタブへ移動",
    hMouseDbl: "タブをダブルクリック",
    hRename: "タブ名を変更",
    hMouseDrag: "タブをドラッグ",
    hReorder: "タブの順序を変更",
    hFocusPane: "ペイン間でフォーカス移動",
    hMouseClick: "ペインをクリック",
    hFocusClick: "そのペインをフォーカス",
    hMouseSplitter: "仕切りをドラッグ",
    hResize: "ペインのサイズ変更",
    hSelect: "マウスで選択",
    hSelectCopy: "選択範囲をコピー",
    hMiddle: "マウス中ボタン",
    hBash: "bash キーバインド（単語削除、行頭、履歴検索…）",
    theme: "テーマ",
    hgView: "表示",
    hZoom: "文字を拡大 / 縮小",
    hZoomReset: "ズームをリセット",
    hWheel: "文字をズーム",
    sshSection: "SSH 接続",
    addSsh: "SSH 接続を追加",
    delete: "削除",
    editConfig: "config.json を編集",
    sshTitle: "新しい SSH 接続",
    fName: "名前",
    fHost: "ホスト",
    fUser: "ユーザー",
    fPort: "ポート",
    fKey: "鍵（任意）",
    cancel: "キャンセル",
    save: "保存",
    phName: "マイサーバー",
    phHost: "192.168.0.10 または example.com",
    processExited: "プロセスが終了しました",
    tipNewTab: "新しいタブ (Ctrl+Shift+T)",
    tipMenu: "メニュー",
    tipMin: "最小化",
    tipMax: "最大化",
    tipClose: "閉じる",
  },
};

let locale = "en";

const SSH_FORM_TEXT = {
  uk: { edit: "Редагувати SSH-підключення", action: "Редагувати", host: "Вкажіть хост без пробілів і дефіса на початку.", port: "Вкажіть порт від 1 до 65535." },
  en: { edit: "Edit SSH connection", action: "Edit", host: "Enter a host without spaces or a leading dash.", port: "Enter a port from 1 to 65535." },
  de: { edit: "SSH-Verbindung bearbeiten", action: "Bearbeiten", host: "Host ohne Leerzeichen oder führenden Bindestrich eingeben.", port: "Port zwischen 1 und 65535 eingeben." },
  fr: { edit: "Modifier la connexion SSH", action: "Modifier", host: "Saisissez un hôte sans espace ni tiret initial.", port: "Saisissez un port entre 1 et 65535." },
  es: { edit: "Editar conexión SSH", action: "Editar", host: "Introduce un host sin espacios ni guion inicial.", port: "Introduce un puerto entre 1 y 65535." },
  pl: { edit: "Edytuj połączenie SSH", action: "Edytuj", host: "Podaj host bez spacji i początkowego łącznika.", port: "Podaj port od 1 do 65535." },
  cs: { edit: "Upravit připojení SSH", action: "Upravit", host: "Zadejte hostitele bez mezer a úvodní pomlčky.", port: "Zadejte port od 1 do 65535." },
  lt: { edit: "Redaguoti SSH ryšį", action: "Redaguoti", host: "Įveskite serverį be tarpų ir pradinio brūkšnelio.", port: "Įveskite prievadą nuo 1 iki 65535." },
  lv: { edit: "Rediģēt SSH savienojumu", action: "Rediģēt", host: "Ievadiet resursdatoru bez atstarpēm un sākuma defises.", port: "Ievadiet portu no 1 līdz 65535." },
  et: { edit: "Muuda SSH-ühendust", action: "Muuda", host: "Sisesta host ilma tühikute ja alguskriipsuta.", port: "Sisesta port vahemikus 1 kuni 65535." },
  no: { edit: "Rediger SSH-tilkobling", action: "Rediger", host: "Skriv inn vert uten mellomrom eller innledende bindestrek.", port: "Skriv inn en port fra 1 til 65535." },
  ro: { edit: "Editează conexiunea SSH", action: "Editează", host: "Introdu un host fără spații sau cratimă la început.", port: "Introdu un port între 1 și 65535." },
  az: { edit: "SSH bağlantısını redaktə et", action: "Redaktə et", host: "Boşluqsuz və başlanğıc tiresiz host daxil edin.", port: "1-dən 65535-ə qədər port daxil edin." },
  ja: { edit: "SSH 接続を編集", action: "編集", host: "空白や先頭のハイフンを含まないホストを入力してください。", port: "1～65535 のポートを入力してください。" },
};

function sshText(key) {
  return SSH_FORM_TEXT[locale]?.[key] ?? SSH_FORM_TEXT.en[key];
}

function tr(key) {
  return I18N[locale]?.[key] ?? I18N.en[key] ?? key;
}

// Pick the best supported locale from the OS/browser languages on first run.
// Falls back to English when none of the OS languages is supported.
function detectLocale() {
  const prefs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || "en"];
  for (const pref of prefs) {
    let code = String(pref).toLowerCase().split("-")[0];
    if (code === "nb" || code === "nn") code = "no"; // Norwegian variants
    if (code === "mo") code = "ro"; // Moldovan → Romanian
    if (I18N[code]) return code;
  }
  return "en";
}

// Refresh static UI chrome (titlebar tooltips) for the current locale.
function applyI18n() {
  document.documentElement.lang = locale;
  const setTitle = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.title = tr(key);
      el.setAttribute("aria-label", tr(key));
    }
  };
  const newTabTip = `${panelText("currentDirectory")} (Ctrl+Shift+T)`;
  document.getElementById("new-tab").title = newTabTip;
  document.getElementById("new-tab").setAttribute("aria-label", newTabTip);
  setTitle("profile-btn", "tipMenu");
  setTitle("win-min", "tipMin");
  setTitle("win-max", "tipMax");
  setTitle("win-close", "tipClose");
  const searchInput = document.getElementById("search-input");
  searchInput.placeholder = panelText("searchPlaceholder");
  searchInput.setAttribute("aria-label", panelText("search"));
  for (const [id, key] of [["search-prev", "previous"], ["search-next", "next"]]) {
    document.getElementById(id).title = panelText(key);
    document.getElementById(id).setAttribute("aria-label", panelText(key));
  }
  document.getElementById("search-close").title = tr("tipClose");
  document.getElementById("search-close").setAttribute("aria-label", tr("tipClose"));
  for (const close of document.querySelectorAll(".tab .close")) {
    close.title = tr("closeTab");
    close.setAttribute("aria-label", tr("closeTab"));
  }
}

function setLocale(code) {
  locale = code;
  applyI18n();
  buildProfileMenu();
  persistState();
}

// ---------------------------------------------------------------------------
// Config (profiles, theme, font) — loaded once from the Rust side.
// ---------------------------------------------------------------------------
let config = null;

function xtermTheme(t) {
  return {
    background: t.background,
    foreground: t.foreground,
    cursor: t.cursor,
    cursorAccent: t.background,
    selectionBackground: t.selection,
    black: t.black,
    red: t.red,
    green: t.green,
    yellow: t.yellow,
    blue: t.blue,
    magenta: t.magenta,
    cyan: t.cyan,
    white: t.white,
    brightBlack: t.brightBlack,
    brightRed: t.brightRed,
    brightGreen: t.brightGreen,
    brightYellow: t.brightYellow,
    brightBlue: t.brightBlue,
    brightMagenta: t.brightMagenta,
    brightCyan: t.brightCyan,
    brightWhite: t.brightWhite,
  };
}

// ---------------------------------------------------------------------------
// Built-in themes. Each has `term` (xterm palette) + `ui` (app-chrome colours).
// ---------------------------------------------------------------------------
const THEMES = {
  "tokyo-night": {
    label: "Tokyo Night",
    ui: { bg: "#1a1b26", bgElev: "#1f2335", fg: "#c0caf5", muted: "#565f89", accent: "#7aa2f7", accent2: "#bb9af7", border: "#2a2e44", tabActive: "#292e42", danger: "#f7768e" },
    term: { background: "#1a1b26", foreground: "#c0caf5", cursor: "#c0caf5", selection: "#33467c", black: "#15161e", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68", blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", white: "#a9b1d6", brightBlack: "#414868", brightRed: "#f7768e", brightGreen: "#9ece6a", brightYellow: "#e0af68", brightBlue: "#7aa2f7", brightMagenta: "#bb9af7", brightCyan: "#7dcfff", brightWhite: "#c0caf5" },
  },
  dracula: {
    label: "Dracula",
    ui: { bg: "#282a36", bgElev: "#21222c", fg: "#f8f8f2", muted: "#6272a4", accent: "#bd93f9", accent2: "#ff79c6", border: "#3a3c4e", tabActive: "#343746", danger: "#ff5555" },
    term: { background: "#282a36", foreground: "#f8f8f2", cursor: "#f8f8f2", selection: "#44475a", black: "#21222c", red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c", blue: "#bd93f9", magenta: "#ff79c6", cyan: "#8be9fd", white: "#f8f8f2", brightBlack: "#6272a4", brightRed: "#ff6e6e", brightGreen: "#69ff94", brightYellow: "#ffffa5", brightBlue: "#d6acff", brightMagenta: "#ff92df", brightCyan: "#a4ffff", brightWhite: "#ffffff" },
  },
  "gruvbox-dark": {
    label: "Gruvbox Dark",
    ui: { bg: "#282828", bgElev: "#32302f", fg: "#ebdbb2", muted: "#928374", accent: "#fabd2f", accent2: "#d3869b", border: "#3c3836", tabActive: "#3c3836", danger: "#fb4934" },
    term: { background: "#282828", foreground: "#ebdbb2", cursor: "#ebdbb2", selection: "#504945", black: "#282828", red: "#cc241d", green: "#98971a", yellow: "#d79921", blue: "#458588", magenta: "#b16286", cyan: "#689d6a", white: "#a89984", brightBlack: "#928374", brightRed: "#fb4934", brightGreen: "#b8bb26", brightYellow: "#fabd2f", brightBlue: "#83a598", brightMagenta: "#d3869b", brightCyan: "#8ec07c", brightWhite: "#ebdbb2" },
  },
  nord: {
    label: "Nord",
    ui: { bg: "#2e3440", bgElev: "#3b4252", fg: "#d8dee9", muted: "#616e88", accent: "#88c0d0", accent2: "#b48ead", border: "#3b4252", tabActive: "#434c5e", danger: "#bf616a" },
    term: { background: "#2e3440", foreground: "#d8dee9", cursor: "#d8dee9", selection: "#434c5e", black: "#3b4252", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b", blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0", white: "#e5e9f0", brightBlack: "#4c566a", brightRed: "#bf616a", brightGreen: "#a3be8c", brightYellow: "#ebcb8b", brightBlue: "#81a1c1", brightMagenta: "#b48ead", brightCyan: "#8fbcbb", brightWhite: "#eceff4" },
  },
  "one-dark": {
    label: "One Dark",
    ui: { bg: "#282c34", bgElev: "#21252b", fg: "#abb2bf", muted: "#5c6370", accent: "#61afef", accent2: "#c678dd", border: "#3a3f4b", tabActive: "#2c313a", danger: "#e06c75" },
    term: { background: "#282c34", foreground: "#abb2bf", cursor: "#abb2bf", selection: "#3e4451", black: "#282c34", red: "#e06c75", green: "#98c379", yellow: "#e5c07b", blue: "#61afef", magenta: "#c678dd", cyan: "#56b6c2", white: "#abb2bf", brightBlack: "#5c6370", brightRed: "#e06c75", brightGreen: "#98c379", brightYellow: "#e5c07b", brightBlue: "#61afef", brightMagenta: "#c678dd", brightCyan: "#56b6c2", brightWhite: "#ffffff" },
  },
  "solarized-light": {
    label: "Solarized Light",
    ui: { bg: "#fdf6e3", bgElev: "#eee8d5", fg: "#586e75", muted: "#93a1a1", accent: "#268bd2", accent2: "#d33682", border: "#ddd6c1", tabActive: "#e8e1cb", danger: "#dc322f" },
    term: { background: "#fdf6e3", foreground: "#657b83", cursor: "#586e75", selection: "#eee8d5", black: "#073642", red: "#dc322f", green: "#859900", yellow: "#b58900", blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198", white: "#eee8d5", brightBlack: "#93a1a1", brightRed: "#cb4b16", brightGreen: "#586e75", brightYellow: "#657b83", brightBlue: "#839496", brightMagenta: "#6c71c4", brightCyan: "#93a1a1", brightWhite: "#fdf6e3" },
  },
};

// Keep the light theme's primary text legible on both terminal and menus.
THEMES["solarized-light"].ui.fg = "#52666d";
THEMES["solarized-light"].term.foreground = "#52666d";

let themeId = "tokyo-night";
let currentTheme = THEMES["tokyo-night"];
let fontSize = 13;
let fontChoice = "";
let baseThemeCustomized = false;

const FONT_CHOICES = ["", "Cascadia Code", "Cascadia Mono", "Consolas", "JetBrains Mono", "Fira Code", "Iosevka Term"];

function mixColor(first, second, weight) {
  const hex = (value) => value.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16));
  const a = hex(first);
  const b = hex(second);
  return `#${a.map((channel, index) => Math.round(channel * (1 - weight) + b[index] * weight).toString(16).padStart(2, "0")).join("")}`;
}

const PANEL_TEXT = {
  uk: { settings: "Налаштування", appearance: "Вигляд", integrations: "Інтеграції", advanced: "Додатково", fontSize: "Розмір шрифту", search: "Пошук у терміналі", searchPlaceholder: "Шукати у виводі…", previous: "Попередній збіг", next: "Наступний збіг", noMatches: "Немає збігів", currentDirectory: "Нова вкладка в поточній директорії" },
  en: { settings: "Settings", appearance: "Appearance", integrations: "Integrations", advanced: "Advanced", fontSize: "Font size", search: "Find in terminal", searchPlaceholder: "Search terminal output…", previous: "Previous match", next: "Next match", noMatches: "No matches", currentDirectory: "New tab in current directory" },
  de: { settings: "Einstellungen", appearance: "Darstellung", integrations: "Integrationen", advanced: "Erweitert", fontSize: "Schriftgröße", search: "Im Terminal suchen", searchPlaceholder: "Terminalausgabe durchsuchen…", previous: "Vorheriger Treffer", next: "Nächster Treffer", noMatches: "Keine Treffer", currentDirectory: "Neuer Tab im aktuellen Verzeichnis" },
  fr: { settings: "Paramètres", appearance: "Apparence", integrations: "Intégrations", advanced: "Avancé", fontSize: "Taille de police", search: "Rechercher dans le terminal", searchPlaceholder: "Rechercher dans la sortie…", previous: "Résultat précédent", next: "Résultat suivant", noMatches: "Aucun résultat", currentDirectory: "Nouvel onglet dans le dossier actuel" },
  es: { settings: "Configuración", appearance: "Apariencia", integrations: "Integraciones", advanced: "Avanzado", fontSize: "Tamaño de fuente", search: "Buscar en el terminal", searchPlaceholder: "Buscar en la salida…", previous: "Coincidencia anterior", next: "Coincidencia siguiente", noMatches: "Sin coincidencias", currentDirectory: "Nueva pestaña en el directorio actual" },
  pl: { settings: "Ustawienia", appearance: "Wygląd", integrations: "Integracje", advanced: "Zaawansowane", fontSize: "Rozmiar czcionki", search: "Szukaj w terminalu", searchPlaceholder: "Szukaj w wynikach…", previous: "Poprzedni wynik", next: "Następny wynik", noMatches: "Brak wyników", currentDirectory: "Nowa karta w bieżącym katalogu" },
  cs: { settings: "Nastavení", appearance: "Vzhled", integrations: "Integrace", advanced: "Pokročilé", fontSize: "Velikost písma", search: "Hledat v terminálu", searchPlaceholder: "Hledat ve výstupu…", previous: "Předchozí shoda", next: "Další shoda", noMatches: "Žádné shody", currentDirectory: "Nová karta v aktuálním adresáři" },
  lt: { settings: "Nustatymai", appearance: "Išvaizda", integrations: "Integracijos", advanced: "Išplėstiniai", fontSize: "Šrifto dydis", search: "Ieškoti terminale", searchPlaceholder: "Ieškoti išvestyje…", previous: "Ankstesnis rezultatas", next: "Kitas rezultatas", noMatches: "Nėra rezultatų", currentDirectory: "Naujas skirtukas dabartiniame aplanke" },
  lv: { settings: "Iestatījumi", appearance: "Izskats", integrations: "Integrācijas", advanced: "Papildu", fontSize: "Fonta lielums", search: "Meklēt terminālī", searchPlaceholder: "Meklēt izvadē…", previous: "Iepriekšējais rezultāts", next: "Nākamais rezultāts", noMatches: "Nav rezultātu", currentDirectory: "Jauna cilne pašreizējā mapē" },
  et: { settings: "Seaded", appearance: "Välimus", integrations: "Integratsioonid", advanced: "Täpsemad", fontSize: "Fondi suurus", search: "Otsi terminalist", searchPlaceholder: "Otsi väljundist…", previous: "Eelmine vaste", next: "Järgmine vaste", noMatches: "Vasteid pole", currentDirectory: "Uus kaart praeguses kaustas" },
  no: { settings: "Innstillinger", appearance: "Utseende", integrations: "Integrasjoner", advanced: "Avansert", fontSize: "Skriftstørrelse", search: "Søk i terminalen", searchPlaceholder: "Søk i utdata…", previous: "Forrige treff", next: "Neste treff", noMatches: "Ingen treff", currentDirectory: "Ny fane i gjeldende mappe" },
  ro: { settings: "Setări", appearance: "Aspect", integrations: "Integrări", advanced: "Avansat", fontSize: "Dimensiunea fontului", search: "Caută în terminal", searchPlaceholder: "Caută în ieșire…", previous: "Rezultatul anterior", next: "Rezultatul următor", noMatches: "Niciun rezultat", currentDirectory: "Filă nouă în directorul curent" },
  az: { settings: "Parametrlər", appearance: "Görünüş", integrations: "İnteqrasiyalar", advanced: "Əlavə", fontSize: "Şrift ölçüsü", search: "Terminalda axtar", searchPlaceholder: "Çıxışda axtar…", previous: "Əvvəlki nəticə", next: "Növbəti nəticə", noMatches: "Nəticə yoxdur", currentDirectory: "Cari qovluqda yeni tab" },
  ja: { settings: "設定", appearance: "外観", integrations: "連携", advanced: "詳細", fontSize: "文字サイズ", search: "ターミナル内を検索", searchPlaceholder: "出力を検索…", previous: "前の一致", next: "次の一致", noMatches: "一致なし", currentDirectory: "現在のディレクトリで新しいタブ" },
};
function panelText(key) { return PANEL_TEXT[locale]?.[key] ?? PANEL_TEXT.en[key]; }

const FONT_TEXT = {
  uk: ["Шрифт термінала", "За замовчуванням", "Власний шрифт", "Застосувати", "Шрифт має бути встановлений у Windows"],
  en: ["Terminal font", "System default", "Custom font", "Apply", "The font must be installed in Windows"],
  de: ["Terminalschrift", "Systemstandard", "Eigene Schrift", "Anwenden", "Die Schrift muss in Windows installiert sein"],
  fr: ["Police du terminal", "Par défaut", "Police personnalisée", "Appliquer", "La police doit être installée dans Windows"],
  es: ["Fuente del terminal", "Predeterminada", "Fuente personalizada", "Aplicar", "La fuente debe estar instalada en Windows"],
  pl: ["Czcionka terminala", "Domyślna", "Własna czcionka", "Zastosuj", "Czcionka musi być zainstalowana w Windows"],
  cs: ["Písmo terminálu", "Výchozí", "Vlastní písmo", "Použít", "Písmo musí být nainstalované ve Windows"],
  lt: ["Terminalo šriftas", "Numatytasis", "Pasirinktas šriftas", "Taikyti", "Šriftas turi būti įdiegtas sistemoje Windows"],
  lv: ["Termināļa fonts", "Noklusējuma", "Pielāgots fonts", "Lietot", "Fontam jābūt instalētam Windows"],
  et: ["Terminali font", "Vaikimisi", "Kohandatud font", "Rakenda", "Font peab olema Windowsisse installitud"],
  no: ["Terminalskrift", "Systemstandard", "Egen skrifttype", "Bruk", "Skrifttypen må være installert i Windows"],
  ro: ["Font terminal", "Implicit", "Font personalizat", "Aplică", "Fontul trebuie instalat în Windows"],
  az: ["Terminal şrifti", "Standart", "Fərdi şrift", "Tətbiq et", "Şrift Windows-da quraşdırılmalıdır"],
  ja: ["ターミナルのフォント", "標準", "カスタムフォント", "適用", "フォントは Windows にインストールされている必要があります"],
};
function fontText(index) { return (FONT_TEXT[locale] ?? FONT_TEXT.en)[index]; }

function configureBaseTheme() {
  if (!config.theme || typeof config.theme !== "object") return;
  const original = THEMES["tokyo-night"];
  const term = { ...original.term };
  for (const key of Object.keys(term)) {
    if (typeof config.theme[key] === "string" && /^#[0-9a-f]{6}$/i.test(config.theme[key])) {
      term[key] = config.theme[key];
    }
  }
  baseThemeCustomized = Object.keys(term).some((key) => term[key] !== original.term[key]);
  if (!baseThemeCustomized) return;
  const ui = {
    ...original.ui,
    bg: term.background,
    fg: term.foreground,
    bgElev: mixColor(term.background, term.foreground, 0.05),
    tabActive: mixColor(term.background, term.foreground, 0.09),
    border: mixColor(term.background, term.foreground, 0.16),
    accent: term.blue,
    accent2: term.magenta,
    danger: term.red,
  };
  THEMES["tokyo-night"] = { ...original, term, ui };
}

function applyTheme(theme) {
  currentTheme = theme;
  const r = document.documentElement.style;
  const u = theme.ui;
  r.setProperty("--bg", u.bg);
  r.setProperty("--bg-elev", u.bgElev);
  r.setProperty("--fg", u.fg);
  const readableMuted = {
    "tokyo-night": "#929cc8",
    dracula: "#a8b2d8",
    "gruvbox-dark": "#b8aa8a",
    nord: "#a5b3c8",
    "one-dark": "#9ba6b7",
    "solarized-light": "#52666d",
  };
  r.setProperty("--muted", baseThemeCustomized && themeId === "tokyo-night" ? u.fg : readableMuted[themeId] ?? u.muted);
  r.setProperty("--accent", u.accent);
  r.setProperty("--accent-2", u.accent2);
  r.setProperty("--border", u.border);
  r.setProperty("--tab-active", u.tabActive);
  r.setProperty("--danger", u.danger);
  for (const lf of leaves.values()) lf.term.options.theme = xtermTheme(theme.term);
}

function setTheme(id) {
  if (!THEMES[id]) return;
  themeId = id;
  applyTheme(THEMES[id]);
  buildProfileMenu();
  persistState();
}

function setFontSize(n) {
  fontSize = Math.max(6, Math.min(40, n));
  for (const lf of leaves.values()) lf.term.options.fontSize = fontSize;
  const tab = tabs.get(activeTabId);
  if (tab) requestAnimationFrame(() => fitTab(tab));
  persistState();
}

// ---------------------------------------------------------------------------
// Tab / session management
// ---------------------------------------------------------------------------
// A tab owns a binary layout TREE of panes. Each node is either:
//   { type:"leaf",  leaf, parent }
//   { type:"split", dir:"row"|"col", a, b, sizes:[na,nb], parent, el }
// A leaf wraps one terminal + one backend PTY session.
const tabs = new Map(); // tabId   -> Tab
const leaves = new Map(); // sessionId -> Leaf (for PTY output dispatch)
let activeTabId = null;
let tabSeq = 0;
let pendingTabFocus = null;
let restoringState = false;
let searchState = null;

let sshConnections = []; // [{ name, host, user, port, key }]
let sshPath = "ssh"; // resolved by the backend

const $tabs = document.getElementById("tabs");
const $panes = document.getElementById("panes");

function showError(error) {
  console.error(error);
  const notice = document.createElement("div");
  notice.className = "error-notice";
  notice.setAttribute("role", "alert");
  notice.textContent = String(error);
  document.getElementById("error-notices")?.appendChild(notice);
  setTimeout(() => notice.remove(), 8000);
}

function fontFallback() {
  return typeof config.fontFamily === "string" && config.fontFamily.trim()
    ? config.fontFamily : "Consolas, monospace";
}

function fontStack() {
  return fontChoice ? `"${fontChoice}", ${fontFallback()}` : fontFallback();
}

function setFontChoice(name) {
  const next = String(name).trim();
  if (next.length > 80 || /[\x00-\x1f"\\]/.test(next)) return false;
  fontChoice = next;
  for (const leaf of leaves.values()) leaf.term.options.fontFamily = fontStack();
  const tab = tabs.get(activeTabId);
  if (tab) requestAnimationFrame(() => fitTab(tab));
  persistState();
  return true;
}

// ---- tree helpers ----
function leavesOf(node, acc = []) {
  if (!node) return acc;
  if (node.type === "leaf") acc.push(node.leaf);
  else {
    leavesOf(node.a, acc);
    leavesOf(node.b, acc);
  }
  return acc;
}
function firstLeaf(node) {
  while (node.type === "split") node = node.a;
  return node.leaf;
}
function replaceChild(parent, oldC, newC) {
  if (parent.a === oldC) parent.a = newC;
  else parent.b = newC;
}
function activeLeaf() {
  return tabs.get(activeTabId)?.activeLeaf ?? null;
}

function serializeNode(node) {
  if (node.type === "leaf") {
    return { type: "leaf", profile: serializeProfile(node.leaf.profile) };
  }
  return {
    type: "split",
    dir: node.dir,
    sizes: [...node.sizes],
    a: serializeNode(node.a),
    b: serializeNode(node.b),
  };
}

function panePath(node, target) {
  if (!node || !target) return null;
  if (node === target) return "";
  if (node.type === "leaf") return null;
  const left = panePath(node.a, target);
  if (left !== null) return `a${left}`;
  const right = panePath(node.b, target);
  return right === null ? null : `b${right}`;
}

function leafAtPath(root, path) {
  let node = root;
  for (const direction of String(path ?? "")) {
    if (node.type !== "split" || (direction !== "a" && direction !== "b")) {
      return firstLeaf(root);
    }
    node = node[direction];
  }
  return node.type === "leaf" ? node.leaf : firstLeaf(node);
}

// Persist open tabs + their pane layout (so renamed tabs and splits survive a
// restart), SSH connections, and the chosen language.
let saveTimer = null;
let saveChain = Promise.resolve();

function stateSnapshot() {
  const liveTabs = [...tabs.values()].filter((t) => t.root);
  const tabsArr = liveTabs.map((t) => ({
      name: t.customName ?? null,
      profile: serializeProfile(t.profile),
      layout: serializeNode(t.root),
      activePane: panePath(t.root, t.activeLeaf?.node),
    }));
  return {
    tabs: tabsArr,
    activeTab: liveTabs.findIndex((tab) => tab.id === activeTabId),
    ssh: sshConnections.map((connection) => ({ ...connection })),
    locale,
    theme: themeId,
    fontSize,
    fontChoice,
  };
}

function flushState() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (restoringState) return saveChain;
  const state = stateSnapshot();
  saveChain = saveChain.catch(() => {}).then(() => invoke("save_state", { state }));
  return saveChain.catch((error) => {
    console.error("Failed to save state:", error);
    showError(error);
  });
}

function persistState() {
  if (restoringState) return;
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushState, 120);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function termOptions() {
  return {
    allowProposedApi: true,
    fontFamily: fontStack(),
    fontSize: fontSize,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: "bar",
    scrollback: config.scrollback ?? 10000,
    macOptionIsMeta: true,
    theme: xtermTheme(currentTheme.term),
    allowTransparency: false,
  };
}

// Attach a renderer to a terminal.
//
// GPU renderers (WebGL, Canvas) pre-render glyphs into a fixed-size texture
// atlas. At fractional display scaling (Windows 125%/150% → devicePixelRatio
// 1.25/1.5) the rounded cell width drifts by sub-pixels; the error eventually
// jumps a whole pixel, so characters glue together or a whole line looks
// shifted by one cell. It's very visible in UIs that repaint a line rapidly
// (e.g. Claude Code's input box) and Canvas only makes it rarer, not gone.
// xterm's built-in DOM renderer instead lays out live browser text, which stays
// sub-pixel accurate. WebGL remains an explicit config opt-in at integer DPR.
function loadRenderer(term) {
  if (config.renderer !== "webgl" || !Number.isInteger(window.devicePixelRatio)) return;
  try {
    const addon = new WebglAddon();
    addon.onContextLoss(() => addon.dispose());
    term.loadAddon(addon);
  } catch {
    // WebGL unavailable (no GPU / context lost) — xterm falls back to DOM.
  }
}

// Create one pane: a terminal element + backend PTY session, wrapped in a Leaf.
async function makeLeaf(tab, profile) {
  const el = document.createElement("div");
  el.className = "leaf";
  tab.container.appendChild(el); // attach so xterm can measure on open

  const term = new Terminal(termOptions());
  const fit = new FitAddon();
  const search = new SearchAddon();
  term.loadAddon(fit);
  term.loadAddon(search);
  term.loadAddon(new WebLinksAddon());
  term.open(el);
  loadRenderer(term);
  try {
    fit.fit();
  } catch {}

  let sessionId;
  try {
    sessionId = await invoke("create_session", {
      profile: {
        name: profile.name,
        shell: profile.shell,
        args: sessionArgs(profile),
        cwd: profile.cwd ?? null,
      },
      cols: term.cols || 80,
      rows: term.rows || 24,
    });
  } catch (error) {
    term.dispose();
    el.remove();
    throw error;
  }

  const leaf = {
    sessionId,
    term,
    fit,
    search,
    el,
    profile,
    tab,
    node: null,
    ro: null,
    inputBuffer: "",
    inputRunning: false,
    resizePending: null,
    resizeRunning: false,
    resizeErrorShown: false,
    closed: false,
    // Last grid size sent to the PTY, so we can skip redundant resizes.
    lastCols: term.cols,
    lastRows: term.rows,
  };
  leaf.node = { type: "leaf", leaf, parent: null };
  el._leaf = leaf;
  leaves.set(sessionId, leaf);
  const updateCwd = (cwd) => {
    if (cwd && cwd !== leaf.profile.cwd) {
      leaf.profile = { ...leaf.profile, cwd };
      if (!tab.root || tab.activeLeaf === leaf || leavesOf(tab.root).length === 1) {
        tab.profile = leaf.profile;
      }
      persistState();
    }
  };
  term.parser.registerOscHandler(7, (value) => {
    if (leaf.profile.kind !== "ssh") {
      updateCwd(cwdFromOsc7(value, /(?:^|[\\/])wsl(?:\.exe)?$/i.test(leaf.profile.shell)));
    }
    return true;
  });
  term.parser.registerOscHandler(777, (value) => {
    if (leaf.profile.kind !== "ssh" && /(?:^|[\\/])cmd(?:\.exe)?$/i.test(leaf.profile.shell)) {
      updateCwd(cwdFromCmdOsc(value));
    } else if (leaf.profile.kind !== "ssh" && /(?:^|[\\/])wsl(?:\.exe)?$/i.test(leaf.profile.shell)) {
      updateCwd(cwdFromWslOsc(value));
    }
    return true;
  });

  try {
    await invoke("attach_session", { id: sessionId });
  } catch (error) {
    leaves.delete(sessionId);
    await invoke("close_session", { id: sessionId }).catch(() => {});
    term.dispose();
    el.remove();
    throw error;
  }

  term.onData((data) => enqueueInput(leaf, data));
  if (config.copyOnSelect) {
    term.onSelectionChange(() => {
      if (searchState?.leaf === leaf && document.activeElement?.closest("#search-bar")) return;
      const sel = term.getSelection();
      if (sel && sel.length > 0) clipboardWrite(sel).catch(() => {});
    });
  }
  el.addEventListener("mousedown", () => setActiveLeaf(leaf));
  el.addEventListener("focusin", () => setActiveLeaf(leaf));

  leaf.ro = new ResizeObserver(() => {
    if (leaf.tab.id !== activeTabId) return;
    syncLeafSize(leaf);
  });
  leaf.ro.observe(el);
  return leaf;
}

async function createTab(profile, customName, layoutSpec, activePane) {
  profile = profile || defaultProfile();
  const id = ++tabSeq;
  pendingTabFocus = id;

  const container = document.createElement("div");
  // Let xterm measure the real pane size before its PTY starts producing output.
  container.className = "pane measuring";
  $panes.appendChild(container);

  const tabEl = buildTabButton(id, profile);
  $tabs.appendChild(tabEl);

  const tab = {
    id,
    tabEl,
    profile,
    customName: customName ?? null,
    container,
    root: null,
    activeLeaf: null,
  };
  tabs.set(id, tab);

  if (customName) {
    const lbl = tabEl.querySelector(".label");
    if (lbl) lbl.textContent = customName;
  }

  try {
    tab.root = layoutSpec
      ? await buildNode(tab, layoutSpec, null)
      : (await makeLeaf(tab, profile)).node;
  } catch (error) {
    for (const leaf of [...leaves.values()].filter((leaf) => leaf.tab === tab)) {
      await invoke("close_session", { id: leaf.sessionId }).catch(() => {});
      leaf.ro?.disconnect();
      leaf.term.dispose();
      leaves.delete(leaf.sessionId);
    }
    tab.container.remove();
    tab.tabEl.remove();
    tabs.delete(id);
    if (pendingTabFocus === id) pendingTabFocus = null;
    throw error;
  }
  if (!tabs.has(id) || tab.closing) {
    for (const leaf of [...leaves.values()].filter((candidate) => candidate.tab === tab)) {
      await disposeLeaf(leaf);
    }
    return null;
  }
  tab.activeLeaf = leafAtPath(tab.root, activePane);
  tab.profile = tab.activeLeaf.profile;

  renderTab(tab);
  tab.container.classList.remove("measuring");
  if (pendingTabFocus === id) activate(id, true);
  persistState();
  return id;
}

async function buildNode(tab, spec, parent) {
  if (spec?.type === "split") {
    const validSizes =
      Array.isArray(spec.sizes) &&
      spec.sizes.length === 2 &&
      spec.sizes.every((size) => Number.isFinite(size) && size > 0);
    const node = {
      type: "split",
      dir: spec.dir === "col" ? "col" : "row",
      sizes: validSizes ? spec.sizes : [1, 1],
      parent,
      a: null,
      b: null,
      el: null,
    };
    node.a = await buildNode(tab, spec.a ?? {}, node);
    node.b = await buildNode(tab, spec.b ?? {}, node);
    return node;
  }
  const prof =
    restoreProfile(spec?.profile, config.profiles, sshConnections, sshPath, tab.profile || defaultProfile());
  const leaf = await makeLeaf(tab, prof);
  leaf.node.parent = parent;
  return leaf.node;
}

// ---- layout rendering ----
function renderNode(node) {
  if (node.type === "leaf") return node.leaf.el;

  const c = document.createElement("div");
  c.className = "split " + node.dir;
  node.el = c;

  const aEl = renderNode(node.a);
  const bEl = renderNode(node.b);
  aEl.style.flex = `${node.sizes[0]} 1 0`;
  bEl.style.flex = `${node.sizes[1]} 1 0`;

  const sp = document.createElement("div");
  sp.className = "splitter " + node.dir;
  attachResizer(sp, node, aEl, bEl);

  c.append(aEl, sp, bEl);
  return c;
}

function renderTab(tab) {
  tab.container.innerHTML = "";
  const rootEl = renderNode(tab.root);
  rootEl.style.width = "100%";
  rootEl.style.height = "100%";
  rootEl.style.flex = "";
  tab.container.appendChild(rootEl);
  updateLeafFocus(tab);
  requestAnimationFrame(() => fitTab(tab));
}

function attachResizer(sp, node, aEl, bEl) {
  sp.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const horizontal = node.dir === "row";
    const ra = aEl.getBoundingClientRect();
    const rb = bEl.getBoundingClientRect();
    const totalPx = horizontal ? ra.width + rb.width : ra.height + rb.height;
    if (totalPx <= 0) return;
    const startPos = horizontal ? e.clientX : e.clientY;
    const startA = horizontal ? ra.width : ra.height;
    const totalGrow = node.sizes[0] + node.sizes[1];

    const onMove = (ev) => {
      const pos = horizontal ? ev.clientX : ev.clientY;
      let aPx = startA + (pos - startPos);
      const minimum = Math.min(40, totalPx / 2);
      aPx = Math.max(minimum, Math.min(totalPx - minimum, aPx));
      const aGrow = (aPx / totalPx) * totalGrow;
      node.sizes = [aGrow, totalGrow - aGrow];
      aEl.style.flex = `${node.sizes[0]} 1 0`;
      bEl.style.flex = `${node.sizes[1]} 1 0`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      persistState();
    };
    document.body.style.cursor = horizontal ? "col-resize" : "row-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

// ---- split / close / focus ----
function disposeLeaf(leaf, closeSession = true) {
  leaf.closed = true;
  leaf.ro?.disconnect();
  leaves.delete(leaf.sessionId);
  leaf.term.dispose();
  leaf.el.remove();
  if (closeSession) {
    return invoke("close_session", { id: leaf.sessionId }).catch(() => {});
  }
  return Promise.resolve();
}

function createTabInCurrentDirectory() {
  const profile = activeLeaf()?.profile;
  return createTab(profile ? { ...profile } : defaultProfile());
}

async function splitLeaf(leaf, dir) {
  if (leaf.splitting || leaf.closed) return;
  leaf.splitting = true;
  const tab = leaf.tab;
  const oldNode = leaf.node;
  let newLeaf;
  try {
    newLeaf = await makeLeaf(tab, leaf.profile);
  } catch (error) {
    showError(error);
    leaf.splitting = false;
    return;
  }
  if (!tabs.has(tab.id) || tab.closing || leaf.closed || leaf.closing || panePath(tab.root, oldNode) === null) {
    disposeLeaf(newLeaf);
    leaf.splitting = false;
    return;
  }
  const split = {
    type: "split",
    dir,
    sizes: [1, 1],
    parent: oldNode.parent,
    a: oldNode,
    b: newLeaf.node,
    el: null,
  };
  oldNode.parent = split;
  newLeaf.node.parent = split;
  if (split.parent == null) tab.root = split;
  else replaceChild(split.parent, oldNode, split);

  renderTab(tab);
  tab.activeLeaf = newLeaf;
  tab.profile = newLeaf.profile;
  updateLeafFocus(tab);
  if (activeTabId === tab.id) newLeaf.term.focus();
  leaf.splitting = false;
  persistState();
}

async function closeLeaf(leaf) {
  if (leaf.closed || leaf.closing) return;
  if (searchState?.leaf === leaf) closeSearch(false);
  leaf.closing = true;
  const tab = leaf.tab;
  if (leavesOf(tab.root).length <= 1) {
    await closeTab(tab.id);
    return;
  }
  await invoke("close_session", { id: leaf.sessionId }).catch(() => {});
  if (!tabs.has(tab.id) || panePath(tab.root, leaf.node) === null) return;
  disposeLeaf(leaf, false);

  const node = leaf.node;
  const parent = node.parent;
  const sibling = parent.a === node ? parent.b : parent.a;
  sibling.parent = parent.parent;
  if (parent.parent == null) tab.root = sibling;
  else replaceChild(parent.parent, parent, sibling);

  tab.activeLeaf = firstLeaf(tab.root);
  tab.profile = tab.activeLeaf.profile;
  renderTab(tab);
  updateLeafFocus(tab);
  if (activeTabId === tab.id) tab.activeLeaf.term.focus();
  persistState();
}

function setActiveLeaf(leaf) {
  if (searchState?.leaf !== leaf) closeSearch(false);
  const tab = leaf.tab;
  tab.activeLeaf = leaf;
  tab.profile = leaf.profile;
  if (tab.id !== activeTabId) return;
  updateLeafFocus(tab);
  persistState();
}

function updateLeafFocus(tab) {
  const all = leavesOf(tab.root);
  const multi = all.length > 1;
  for (const lf of all) lf.el.classList.toggle("focused", multi && lf === tab.activeLeaf);
}

// Alt+Arrow: move focus to the nearest pane in the given direction.
function focusDir(dir) {
  const tab = tabs.get(activeTabId);
  if (!tab || !tab.activeLeaf) return;
  const cur = tab.activeLeaf.el.getBoundingClientRect();
  const cx = cur.left + cur.width / 2;
  const cy = cur.top + cur.height / 2;
  let best = null;
  let bestDist = Infinity;
  for (const lf of leavesOf(tab.root)) {
    if (lf === tab.activeLeaf) continue;
    const r = lf.el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    const ok =
      dir === "left" ? dx < -5 : dir === "right" ? dx > 5 : dir === "up" ? dy < -5 : dy > 5;
    if (!ok) continue;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = lf;
    }
  }
  if (best) {
    setActiveLeaf(best);
    best.term.focus();
  }
}

// Fit one leaf to its element; only tell the PTY when the grid actually changed.
// A redundant ConPTY resize (which would otherwise fire on every tab switch)
// makes it re-render its screen buffer, and full-screen TUIs like Claude Code
// drop a cell when that happens. The client-side refresh() is safe — it just
// repaints xterm's existing buffer, fixing a stale frame left by a hidden pane.
function enqueueInput(leaf, data) {
  if (leaf.closed || (!data && !leaf.inputBuffer)) return;
  leaf.inputBuffer += data;
  if (leaf.inputRunning) return;
  leaf.inputRunning = true;
  queueMicrotask(async () => {
    try {
      while (leaf.inputBuffer && !leaf.closed) {
        const chunk = leaf.inputBuffer;
        leaf.inputBuffer = "";
        await invoke("write_session", { id: leaf.sessionId, data: chunk });
      }
    } catch (error) {
      leaf.inputBuffer = "";
      showError(error);
    } finally {
      leaf.inputRunning = false;
      if (leaf.inputBuffer && !leaf.closed) enqueueInput(leaf, "");
    }
  });
}

async function sendResize(leaf) {
  if (leaf.resizeRunning || leaf.closed) return;
  leaf.resizeRunning = true;
  try {
    while (leaf.resizePending && !leaf.closed) {
      const size = leaf.resizePending;
      leaf.resizePending = null;
      if (size.cols === leaf.lastCols && size.rows === leaf.lastRows) continue;
      await invoke("resize_session", { id: leaf.sessionId, ...size });
      leaf.lastCols = size.cols;
      leaf.lastRows = size.rows;
      leaf.resizeErrorShown = false;
    }
  } catch (error) {
    if (!leaf.resizeErrorShown) showError(error);
    leaf.resizeErrorShown = true;
    // Retry on the next size or visibility event.
  } finally {
    leaf.resizeRunning = false;
    if (leaf.resizePending && !leaf.closed) sendResize(leaf);
  }
}

function syncLeafSize(leaf) {
  if (leaf.closed || !leaf.el.clientHeight || !leaf.el.clientWidth) return;
  try {
    const proposed = leaf.fit.proposeDimensions();
    if (!proposed || proposed.cols < 2 || proposed.rows < 1) return;
    if (proposed.cols !== leaf.term.cols || proposed.rows !== leaf.term.rows) {
      leaf.fit.fit();
    }
    const { cols, rows } = leaf.term;
    if (cols !== leaf.lastCols || rows !== leaf.lastRows) {
      leaf.resizePending = { cols, rows };
      sendResize(leaf);
    }
  } catch (error) {
    console.error("Failed to fit terminal:", error);
  }
}

function fitTab(tab) {
  for (const lf of leavesOf(tab.root)) syncLeafSize(lf);
}

// Re-fit the visible tab. Called on window resize and on display-scale (DPR)
// changes — the latter is what leaves the bottom row clipped on scaled displays.
function refitAll() {
  const tab = tabs.get(activeTabId);
  if (tab) fitTab(tab);
}

function buildTabButton(id, profile) {
  const el = document.createElement("div");
  el.className = "tab";
  el.dataset.id = id;
  el.setAttribute("role", "tab");
  el.setAttribute("aria-selected", "false");
  el.tabIndex = 0;

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = profile.color || "var(--accent)";

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = profile.name;

  const close = document.createElement("button");
  close.className = "close";
  close.type = "button";
  close.textContent = "✕";
  close.title = tr("closeTab");
  close.setAttribute("aria-label", tr("closeTab"));
  close.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeTab(id).catch(showError);
  });

  el.append(dot, label, close);
  el.addEventListener("click", () => activate(id));
  el.addEventListener("keydown", (event) => {
    if (event.target !== el) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(id);
    } else if (event.key === "Delete") {
      event.preventDefault();
      closeTab(id).catch(showError);
    }
  });
  // Double-click the tab to rename it (right-click menu is wired globally).
  el.addEventListener("dblclick", (e) => {
    e.preventDefault();
    startRename(id);
  });

  // Drag-and-drop reordering.
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    reorderTabsFromDom();
    persistState();
  });
  return el;
}

// Sync the tabs Map order to the visual DOM order (keeps Alt+digit / Ctrl+Tab
// consistent with what the user sees after a drag).
function reorderTabsFromDom() {
  const order = [...$tabs.querySelectorAll(".tab")].map((el) => Number(el.dataset.id));
  const snapshot = new Map(tabs);
  tabs.clear();
  for (const id of order) if (snapshot.has(id)) tabs.set(id, snapshot.get(id));
}

// During a drag, find the tab the dragged one should be inserted before.
function tabAfterPoint(x) {
  const others = [...$tabs.querySelectorAll(".tab:not(.dragging)")];
  let closest = null;
  let closestDx = -Infinity;
  for (const el of others) {
    const box = el.getBoundingClientRect();
    const dx = x - (box.left + box.width / 2);
    if (dx < 0 && dx > closestDx) {
      closestDx = dx;
      closest = el;
    }
  }
  return closest;
}

// ---------------------------------------------------------------------------
// Tab rename + per-tab context menu
// ---------------------------------------------------------------------------
function startRename(id) {
  const t = tabs.get(id);
  if (!t) return;
  const label = t.tabEl.querySelector(".label");
  if (!label) return;

  const input = document.createElement("input");
  input.className = "tab-rename";
  input.value = t.customName ?? t.profile.name;
  label.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const span = document.createElement("span");
    span.className = "label";
    if (commit) {
      t.customName = input.value.trim() || t.profile.name;
      persistState();
    }
    span.textContent = t.customName ?? t.profile.name;
    input.replaceWith(span);
  };

  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") finish(true);
    else if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("click", (e) => e.stopPropagation());
}

function closeCtxMenu() {
  document.getElementById("ctx-menu")?.remove();
}

function prepareMenu(menu, onEscape) {
  menu.setAttribute("role", "menu");
  for (const item of menu.querySelectorAll("li")) {
    if (item.classList.contains("sep") || item.classList.contains("section-label")) continue;
    item.setAttribute("role", "menuitem");
    item.tabIndex = item.classList.contains("disabled") ? -1 : 0;
    if (item.classList.contains("disabled")) item.setAttribute("aria-disabled", "true");
  }
  if (menu.dataset.keyboardReady === "true") return;
  menu.dataset.keyboardReady = "true";
  menu.addEventListener("keydown", (event) => {
    const item = event.target.closest("li[role='menuitem']");
    if (event.key === "Escape") {
      event.preventDefault();
      onEscape();
    } else if (item && event.target === item && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      item.click();
    } else if (item && event.target === item && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const siblings = [...item.parentElement.children].filter(
        (candidate) => candidate.matches("li[role='menuitem']") && candidate.tabIndex === 0,
      );
      const offset = event.key === "ArrowDown" ? 1 : -1;
      siblings[(siblings.indexOf(item) + offset + siblings.length) % siblings.length]?.focus();
    }
  });
}

function showTabMenu(x, y, id) {
  closeCtxMenu();
  const menu = document.createElement("ul");
  menu.id = "ctx-menu";

  const mk = (text, fn) => {
    const li = document.createElement("li");
    li.textContent = text;
    li.addEventListener("click", () => {
      closeCtxMenu();
      fn();
    });
    return li;
  };

  menu.append(
    mk(tr("rename"), () => startRename(id)),
    mk(tr("duplicate"), () => {
      const t = tabs.get(id);
      if (t) createTab(t.profile).catch(showError);
    }),
    mk(tr("closeTab"), () => closeTab(id).catch(showError)),
  );

  placeMenu(menu, x, y);
}

async function pasteToLeaf(leaf) {
  try {
    const text = await clipboardRead();
    if (!text || leaf.closed || activeLeaf() !== leaf) return;
    leaf.term.focus();
    // xterm normalizes newlines and wraps bracketed paste when the child asks.
    leaf.term.paste(text);
  } catch (error) {
    showError(error);
  } finally {
    if (!leaf.closed && activeLeaf() === leaf) leaf.term.focus();
  }
}

// Right-click menu inside the terminal: Copy / Paste / Select All + splits.
function showTermMenu(x, y) {
  closeCtxMenu();
  const leaf = activeLeaf();
  if (!leaf) return;
  const sel = leaf.term.getSelection();

  const menu = document.createElement("ul");
  menu.id = "ctx-menu";

  const mk = (text, fn, disabled) => {
    const li = document.createElement("li");
    li.textContent = text;
    if (disabled) {
      li.classList.add("disabled");
    } else {
      li.addEventListener("click", () => {
        closeCtxMenu();
        fn();
      });
    }
    return li;
  };
  const sep = () => {
    const li = document.createElement("li");
    li.className = "sep";
    return li;
  };

  menu.append(
    mk(tr("copy"), () => clipboardWrite(sel).catch(showError).finally(() => leaf.term.focus()), !sel),
    mk(tr("paste"), () => pasteToLeaf(leaf)),
    mk(tr("selectAll"), () => {
      leaf.term.selectAll();
      leaf.term.focus();
    }),
    sep(),
    mk(tr("splitRight"), () => splitLeaf(leaf, "row").catch(showError)),
    mk(tr("splitDown"), () => splitLeaf(leaf, "col").catch(showError)),
    mk(tr("closePane"), () => closeLeaf(leaf).catch(showError)),
  );

  placeMenu(menu, x, y);
}

function placeMenu(menu, x, y) {
  document.body.appendChild(menu);
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8)) + "px";
  menu.style.top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8)) + "px";
  prepareMenu(menu, () => {
    closeCtxMenu();
    activeLeaf()?.term.focus();
  });
  menu.querySelector("li[tabindex='0']")?.focus();
}

function activate(id, fromCreation = false) {
  const tab = tabs.get(id);
  if (!tab || !tab.root) return;
  if (activeTabId !== id) closeSearch(false);
  if (!fromCreation || pendingTabFocus === id) pendingTabFocus = null;
  for (const [, other] of tabs) {
    other.container.classList.remove("active");
    other.tabEl.classList.remove("active");
    other.tabEl.setAttribute("aria-selected", "false");
  }
  tab.container.classList.add("active");
  tab.tabEl.classList.add("active");
  tab.tabEl.setAttribute("aria-selected", "true");
  tab.tabEl.scrollIntoView({ block: "nearest", inline: "nearest" });
  activeTabId = id;
  updateLeafFocus(tab);
  requestAnimationFrame(() => {
    fitTab(tab);
    (tab.activeLeaf ?? firstLeaf(tab.root))?.term.focus();
  });
  persistState();
}

async function closeTab(id) {
  const tab = tabs.get(id);
  if (!tab || tab.closing) return;
  if (searchState?.leaf.tab === tab) closeSearch(false);
  tab.closing = true;
  const order = [...tabs.values()].filter((candidate) => candidate.root || candidate.id === id).map((candidate) => candidate.id);
  const index = order.indexOf(id);
  const nextId = order[index + 1] ?? order[index - 1];
  for (const lf of [...leaves.values()].filter((candidate) => candidate.tab === tab)) {
    await disposeLeaf(lf);
  }
  tab.container.remove();
  tab.tabEl.remove();
  tabs.delete(id);
  if (pendingTabFocus === id) pendingTabFocus = null;
  if (activeTabId === id) {
    if (nextId != null) activate(nextId);
    else activeTabId = null;
  }
  persistState();
  if (tabs.size === 0) {
    await flushState();
    await appWindow.close();
  }
}

// ---------------------------------------------------------------------------
// Search the active pane's scrollback without sending keystrokes to the shell.
// ---------------------------------------------------------------------------
function closeSearch(refocus = true) {
  if (!searchState) return;
  searchState.subscription?.dispose();
  searchState.leaf.search.clearDecorations();
  searchState = null;
  document.getElementById("search-bar").hidden = true;
  document.getElementById("search-count").textContent = "";
  if (refocus) activeLeaf()?.term.focus();
}

function searchStep(backward = false, incremental = false) {
  if (!searchState) return;
  const { leaf } = searchState;
  const query = document.getElementById("search-input").value;
  if (!query) {
    leaf.search.clearDecorations();
    document.getElementById("search-count").textContent = "";
    return;
  }
  const options = { decorations: true, incremental };
  const found = backward
    ? leaf.search.findPrevious(query, options)
    : leaf.search.findNext(query, options);
  if (!found) document.getElementById("search-count").textContent = panelText("noMatches");
}

function openSearch() {
  const leaf = activeLeaf();
  if (!leaf) return;
  if (searchState && searchState.leaf !== leaf) closeSearch(false);
  const bar = document.getElementById("search-bar");
  const input = document.getElementById("search-input");
  if (!searchState) {
    searchState = {
      leaf,
      subscription: leaf.search.onDidChangeResults(({ resultIndex, resultCount }) => {
        if (searchState?.leaf !== leaf) return;
        document.getElementById("search-count").textContent = resultCount
          ? (resultIndex >= 0 ? `${resultIndex + 1} / ${resultCount}` : String(resultCount))
          : panelText("noMatches");
      }),
    };
    bar.hidden = false;
    if (input.value) searchStep(false, true);
  }
  input.focus();
  input.select();
}

// ---------------------------------------------------------------------------
// App-level keyboard shortcuts. Handled on the window in the capture phase so
// they fire before xterm (and before WebView2 can swallow combos like
// Ctrl+Shift+T). Anything we don't claim here falls through to the terminal,
// which is how ctrl+w / ctrl+a / ctrl+u / ctrl+r reach readline / PSReadLine.
// ---------------------------------------------------------------------------
function installShortcuts() {
  window.addEventListener(
    "keydown",
    (e) => {
      // Never hijack keys while editing a tab name.
      if (e.target instanceof HTMLInputElement) return;
      if (document.getElementById("help-overlay") || document.getElementById("ssh-overlay") || document.getElementById("settings-overlay")) return;

      const ctrl = e.ctrlKey;
      const shift = e.shiftKey;
      const k = shortcutKey(e);

      if ((k === "contextmenu" || (k === "f10" && shift)) && !ctrl && !e.altKey) {
        const leaf = activeLeaf();
        if (leaf) {
          e.preventDefault();
          e.stopPropagation();
          const rect = leaf.el.getBoundingClientRect();
          showTermMenu(rect.left + 24, rect.top + 24);
        }
        return;
      }

      // F1 — help overlay.
      if (k === "f1" && !ctrl && !shift && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        openHelp();
        return;
      }

      if (ctrl && shift) {
        if (k === "t") {
          e.preventDefault();
          e.stopPropagation();
          createTabInCurrentDirectory().catch(showError);
          return;
        }
        if (k === "f") {
          e.preventDefault();
          e.stopPropagation();
          openSearch();
          return;
        }
        if (k === "w") {
          // Close the focused pane (closes the tab if it's the last pane).
          e.preventDefault();
          e.stopPropagation();
          const lf = activeLeaf();
          if (lf) closeLeaf(lf).catch(showError);
          return;
        }
        if (k === "d") {
          // Split focused pane to the right.
          e.preventDefault();
          e.stopPropagation();
          const lf = activeLeaf();
          if (lf) splitLeaf(lf, "row").catch(showError);
          return;
        }
        if (k === "e") {
          // Split focused pane downwards.
          e.preventDefault();
          e.stopPropagation();
          const lf = activeLeaf();
          if (lf) splitLeaf(lf, "col").catch(showError);
          return;
        }
        if (k === "c") {
          const sel = activeLeaf()?.term.getSelection();
          if (sel) {
            e.preventDefault();
            e.stopPropagation();
            clipboardWrite(sel).catch(() => {});
          }
          return;
        }
        if (k === "v") {
          e.preventDefault();
          e.stopPropagation();
          const lf = activeLeaf();
          if (lf) pasteToLeaf(lf);
          return;
        }
      }

      // Alt shortcuts: arrows move pane focus, digits jump to the Nth tab.
      if (e.altKey && !ctrl && !shift && !e.metaKey) {
        const arrow = {
          arrowleft: "left",
          arrowright: "right",
          arrowup: "up",
          arrowdown: "down",
        }[k];
        if (arrow) {
          e.preventDefault();
          e.stopPropagation();
          focusDir(arrow);
          return;
        }
        const m = e.code.match(/^(?:Digit|Numpad)([1-9])$/);
        const n = m ? +m[1] : /^[1-9]$/.test(e.key) ? +e.key : null;
        if (n != null) {
          e.preventDefault();
          e.stopPropagation();
          const ids = [...tabs.keys()];
          if (ids[n - 1] != null) activate(ids[n - 1]);
          return;
        }
      }

      // Ctrl with +/-/0 — zoom the terminal text.
      if (ctrl && !e.altKey) {
        if (k === "=" || k === "+") {
          e.preventDefault();
          e.stopPropagation();
          setFontSize(fontSize + 1);
          return;
        }
        if (k === "-" || k === "_") {
          e.preventDefault();
          e.stopPropagation();
          setFontSize(fontSize - 1);
          return;
        }
        if (k === "0") {
          e.preventDefault();
          e.stopPropagation();
          setFontSize(config.fontSize ?? 13);
          return;
        }
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs.
      if (ctrl && k === "tab") {
        e.preventDefault();
        e.stopPropagation();
        cycleTab(shift ? -1 : 1);
      }
    },
    true,
  );
}

function cycleTab(dir) {
  const ids = [...tabs.keys()];
  if (ids.length < 2) return;
  const idx = ids.indexOf(activeTabId);
  const next = ids[(idx + dir + ids.length) % ids.length];
  activate(next);
}

// ---------------------------------------------------------------------------
// Profiles UI
// ---------------------------------------------------------------------------
function defaultProfile() {
  return (
    config.profiles.find((p) => p.name === config.default) || config.profiles[0]
  );
}

// Whether the Explorer "Open in Abergin" context-menu entry is registered.
let explorerIntegration = false;
let explorerIntegrationAvailable = false;

// Last path segment of a directory — used as the tab title when opened via the
// Explorer context menu.
function baseName(p) {
  const parts = String(p).replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

// Open a new tab whose shell starts in `dir` (default profile, folder as title).
async function openCwdTab(dir) {
  await createTab({ ...defaultProfile(), cwd: dir }, baseName(dir));
}

function setProfileMenuOpen(open) {
  document.getElementById("profile-menu").classList.toggle("hidden", !open);
  document.getElementById("profile-btn").setAttribute("aria-expanded", String(open));
}

function buildProfileMenu() {
  const menu = document.getElementById("profile-menu");
  menu.innerHTML = "";
  for (const p of config.profiles) {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = p.color || "var(--accent)";
    const name = document.createElement("span");
    name.textContent = p.name;
    li.append(sw, name);
    li.addEventListener("click", () => {
      setProfileMenuOpen(false);
      createTab(p).catch(showError);
    });
    menu.appendChild(li);
  }

  const addSep = () => {
    const sep = document.createElement("li");
    sep.className = "sep";
    menu.appendChild(sep);
  };

  // ---- Saved SSH connections ----
  addSep();
  const sshHeader = document.createElement("li");
  sshHeader.className = "section-label";
  sshHeader.textContent = tr("sshSection");
  menu.appendChild(sshHeader);

  for (const conn of sshConnections) {
    const li = document.createElement("li");
    li.className = "ssh-item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = "#bb9af7";
    const name = document.createElement("span");
    name.className = "ssh-name";
    name.textContent = conn.name || (conn.user ? `${conn.user}@${conn.host}` : conn.host);
    const edit = document.createElement("button");
    edit.className = "ssh-edit";
    edit.type = "button";
    edit.textContent = "✎";
    edit.title = sshText("action");
    edit.setAttribute("aria-label", sshText("edit"));
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      setProfileMenuOpen(false);
      openSshForm(conn);
    });
    const del = document.createElement("button");
    del.className = "ssh-del";
    del.type = "button";
    del.textContent = "✕";
    del.title = tr("delete");
    del.setAttribute("aria-label", tr("delete"));
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!window.confirm(`${tr("delete")}: ${conn.name || conn.host}?`)) return;
      sshConnections = sshConnections.filter((c) => c !== conn);
      persistState();
      buildProfileMenu();
    });
    li.append(sw, name, edit, del);
    li.addEventListener("click", () => {
      setProfileMenuOpen(false);
      createTab(sshProfile(conn, sshPath)).catch(showError);
    });
    menu.appendChild(li);
  }

  const addSsh = document.createElement("li");
  addSsh.className = "action";
  addSsh.textContent = "➕  " + tr("addSsh");
  addSsh.addEventListener("click", () => {
    setProfileMenuOpen(false);
    openSshForm();
  });
  menu.appendChild(addSsh);

  // ---- Settings + Help ----
  addSep();
  const settings = document.createElement("li");
  settings.className = "action";
  settings.textContent = "⚙  " + panelText("settings");
  settings.addEventListener("click", () => {
    setProfileMenuOpen(false);
    openSettings();
  });
  menu.appendChild(settings);
  const help = document.createElement("li");
  help.className = "action";
  help.textContent = "❔  " + tr("help");
  help.addEventListener("click", () => {
    setProfileMenuOpen(false);
    openHelp();
  });
  menu.appendChild(help);

  prepareMenu(menu, () => {
    setProfileMenuOpen(false);
    document.getElementById("profile-btn").focus();
  });
}

// ---------------------------------------------------------------------------
// SSH connection manager
// ---------------------------------------------------------------------------
function mountDialog(overlay, card, initialFocus) {
  const previousFocus = document.activeElement;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    if (previousFocus?.isConnected && !previousFocus.closest(".hidden")) previousFocus.focus();
    else activeLeaf()?.term.focus();
  };
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      const focusable = [...card.querySelectorAll("button, input, [tabindex='0']")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  initialFocus.focus();
  return close;
}

function openSettings() {
  document.getElementById("settings-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "settings-overlay";
  const card = document.createElement("div");
  card.className = "settings-card";
  card.setAttribute("aria-labelledby", "settings-title");
  card.innerHTML = `
    <div class="settings-head">
      <div><span class="settings-eyebrow">Abergin</span><h2 id="settings-title">${panelText("settings")}</h2></div>
      <button type="button" class="settings-close" aria-label="${tr("tipClose")}">×</button>
    </div>
    <div class="settings-body">
      <section><h3>${tr("language")}</h3><div class="settings-grid language-grid"></div></section>
      <section><h3>${tr("theme")}</h3><div class="settings-grid theme-grid"></div></section>
      <section><h3>${panelText("appearance")}</h3>
        <div class="settings-row"><span>${panelText("fontSize")}</span>
          <div class="settings-stepper"><button type="button" class="font-decrease" aria-label="−">−</button><output class="font-value">${fontSize}</output><button type="button" class="font-increase" aria-label="+">+</button></div>
        </div>
        <h4 class="settings-subhead">${fontText(0)}</h4>
        <div class="settings-grid font-grid"></div>
        <div class="font-custom-row"><input class="font-custom-input" maxlength="80" aria-label="${fontText(2)}" placeholder="${fontText(2)}" /><button type="button" class="font-apply">${fontText(3)}</button></div>
        <p class="font-hint">${fontText(4)}</p>
        <p class="form-error font-error" role="alert" hidden></p>
      </section>
      ${explorerIntegrationAvailable ? `<section><h3>${panelText("integrations")}</h3>
        <div class="settings-row"><span>${tr("shellIntegration")}</span><button type="button" class="settings-toggle" aria-pressed="${explorerIntegration}">${explorerIntegration ? "✓" : ""}</button></div>
      </section>` : ""}
      <section><h3>${panelText("advanced")}</h3><button type="button" class="settings-advanced">${tr("editConfig")} ↗</button></section>
    </div>`;

  const close = mountDialog(overlay, card, card.querySelector(".settings-close"));
  card.querySelector(".settings-close").addEventListener("click", close);

  for (const lang of LANGUAGES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-option";
    button.setAttribute("aria-pressed", String(lang.code === locale));
    button.textContent = lang.label;
    button.addEventListener("click", () => {
      if (lang.code === locale) return;
      setLocale(lang.code);
      close();
      openSettings();
    });
    card.querySelector(".language-grid").appendChild(button);
  }

  for (const [id, theme] of Object.entries(THEMES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-option theme-option";
    button.setAttribute("aria-pressed", String(id === themeId));
    const swatch = document.createElement("span");
    swatch.className = "theme-swatch";
    swatch.style.background = theme.ui.bg;
    swatch.style.borderColor = theme.ui.accent;
    const label = document.createElement("span");
    label.textContent = theme.label;
    button.append(swatch, label);
    button.addEventListener("click", () => {
      setTheme(id);
      for (const option of card.querySelectorAll(".theme-option")) option.setAttribute("aria-pressed", String(option === button));
    });
    card.querySelector(".theme-grid").appendChild(button);
  }

  for (const [selector, delta] of [[".font-decrease", -1], [".font-increase", 1]]) {
    card.querySelector(selector).addEventListener("click", () => {
      setFontSize(fontSize + delta);
      card.querySelector(".font-value").textContent = String(fontSize);
    });
  }
  const fontGrid = card.querySelector(".font-grid");
  const customFontInput = card.querySelector(".font-custom-input");
  if (fontChoice && !FONT_CHOICES.includes(fontChoice)) customFontInput.value = fontChoice;
  const refreshFonts = () => {
    for (const button of fontGrid.children) button.setAttribute("aria-pressed", String(button.dataset.font === fontChoice));
    customFontInput.classList.toggle("selected", !!fontChoice && !FONT_CHOICES.includes(fontChoice));
  };
  for (const name of FONT_CHOICES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-option font-option";
    button.dataset.font = name;
    button.textContent = name || fontText(1);
    button.style.fontFamily = name ? `"${name}", ${fontFallback()}` : fontFallback();
    button.addEventListener("click", () => {
      setFontChoice(name);
      customFontInput.value = "";
      card.querySelector(".font-error").hidden = true;
      refreshFonts();
    });
    fontGrid.appendChild(button);
  }
  refreshFonts();
  const applyCustomFont = () => {
    const name = customFontInput.value.trim();
    const error = card.querySelector(".font-error");
    if (!name || !setFontChoice(name)) {
      error.textContent = fontText(2);
      error.hidden = false;
      return;
    }
    error.hidden = true;
    refreshFonts();
  };
  card.querySelector(".font-apply").addEventListener("click", applyCustomFont);
  customFontInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCustomFont();
    }
  });
  const toggle = card.querySelector(".settings-toggle");
  toggle?.addEventListener("click", async () => {
    toggle.disabled = true;
    try {
      const next = !explorerIntegration;
      await invoke("set_explorer_integration", { enabled: next });
      explorerIntegration = next;
      toggle.setAttribute("aria-pressed", String(next));
      toggle.textContent = next ? "✓" : "";
    } catch (error) {
      showError(error);
    } finally {
      toggle.disabled = false;
    }
  });
  card.querySelector(".settings-advanced").addEventListener("click", () => invoke("open_config").catch(showError));
}

function openSshForm(existing = null) {
  document.getElementById("ssh-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "ssh-overlay";

  const card = document.createElement("div");
  card.className = "ssh-card";
  card.innerHTML = `
    <h3>${existing ? sshText("edit") : tr("sshTitle")}</h3>
    <label>${tr("fName")}<input data-f="name" placeholder="${tr("phName")}" /></label>
    <label>${tr("fHost")}<input data-f="host" placeholder="${tr("phHost")}" /></label>
    <div class="row">
      <label>${tr("fUser")}<input data-f="user" placeholder="root" /></label>
      <label class="port">${tr("fPort")}<input data-f="port" type="number" min="1" max="65535" placeholder="22" /></label>
    </div>
    <label>${tr("fKey")}<input data-f="key" placeholder="C:\\Users\\...\\id_ed25519" /></label>
    <p class="form-error" role="alert" hidden></p>
    <div class="ssh-actions">
      <button type="button" class="btn-cancel">${tr("cancel")}</button>
      <button type="button" class="btn-save">${tr("save")}</button>
    </div>`;

  const get = (f) => card.querySelector(`[data-f="${f}"]`).value.trim();
  if (existing) {
    for (const field of ["name", "host", "user", "port", "key"]) {
      card.querySelector(`[data-f="${field}"]`).value = existing[field] ?? "";
    }
  }
  const close = mountDialog(overlay, card, card.querySelector('[data-f="name"]'));
  card.querySelector(".btn-cancel").addEventListener("click", close);
  card.querySelector(".btn-save").addEventListener("click", () => {
    const host = get("host");
    const port = Number(get("port") || "22");
    const error = card.querySelector(".form-error");
    if (!host || /^-/.test(host) || /\s/.test(host)) {
      error.textContent = sshText("host");
      error.hidden = false;
      card.querySelector('[data-f="host"]').focus();
      return;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      error.textContent = sshText("port");
      error.hidden = false;
      card.querySelector('[data-f="port"]').focus();
      return;
    }
    const conn = {
      name: get("name"),
      host,
      user: get("user"),
      port: String(port),
      key: get("key"),
    };
    if (existing) Object.assign(existing, conn);
    else sshConnections.push(conn);
    persistState();
    buildProfileMenu();
    close();
  });
}

// ---------------------------------------------------------------------------
// Help overlay
// ---------------------------------------------------------------------------
function openHelp() {
  document.getElementById("help-overlay")?.remove();

  const groups = [
    {
      title: tr("hgTabs"),
      rows: [
        ["Ctrl+Shift+T", panelText("currentDirectory")],
        ["Ctrl+Shift+W", tr("hClosePane")],
        ["Ctrl+Tab", tr("hSwitchTab")],
        ["Alt+1…9", tr("hJumpTab")],
        [tr("hMouseDbl"), tr("hRename")],
        [tr("hMouseDrag"), tr("hReorder")],
      ],
    },
    {
      title: tr("hgPanes"),
      rows: [
        ["Ctrl+Shift+D", tr("splitRight")],
        ["Ctrl+Shift+E", tr("splitDown")],
        ["Alt+←↑↓→", tr("hFocusPane")],
        [tr("hMouseClick"), tr("hFocusClick")],
        [tr("hMouseSplitter"), tr("hResize")],
      ],
    },
    {
      title: tr("hgEdit"),
      rows: [
        ["Ctrl+Shift+C", tr("copy")],
        ["Ctrl+Shift+V", tr("paste")],
        ["Ctrl+Shift+F", panelText("search")],
        [tr("hSelect"), tr("hSelectCopy")],
        [tr("hMiddle"), tr("paste")],
        ["Ctrl+W / Ctrl+A / Ctrl+R …", tr("hBash")],
      ],
    },
    {
      title: tr("hgView"),
      rows: [
        ["Ctrl + = / Ctrl + −", tr("hZoom")],
        ["Ctrl + 0", tr("hZoomReset")],
        ["Ctrl + 🖱", tr("hWheel")],
        ["F1", tr("help")],
      ],
    },
  ];

  const overlay = document.createElement("div");
  overlay.id = "help-overlay";
  const card = document.createElement("div");
  card.className = "help-card";

  let html = `<div class="help-head"><h2>Abergin</h2><span class="help-ver">v${pkg.version}</span></div>
    <p class="help-intro">${tr("hIntro")}</p>`;
  for (const g of groups) {
    html += `<h4>${g.title}</h4><table class="help-tbl">`;
    for (const [keys, desc] of g.rows) {
      html += `<tr><td class="help-key">${keys}</td><td>${desc}</td></tr>`;
    }
    html += `</table>`;
  }
  html += `<div class="help-actions"><button class="btn-save">${tr("tipClose")}</button></div>`;
  card.innerHTML = html;

  const close = mountDialog(overlay, card, card.querySelector(".btn-save"));
  card.querySelector(".btn-save").addEventListener("click", close);
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
async function main() {
  config = await invoke("get_config");
  configureBaseTheme();

  // Restore SSH connections + saved tabs from the previous session.
  const saved = await invoke("get_state").catch(() => ({}));
  sshConnections = Array.isArray(saved.ssh)
    ? saved.ssh.filter((connection) => connection && typeof connection.host === "string" && connection.host.trim())
    : [];
  sshPath = saved.sshPath ?? "ssh";
  locale = I18N[saved.locale] ? saved.locale : detectLocale();
  applyI18n();

  // Restore theme + zoom before any terminal is created.
  const savedFontSize = Number(saved.fontSize ?? config.fontSize);
  fontSize = Number.isFinite(savedFontSize) ? Math.max(6, Math.min(40, savedFontSize)) : 13;
  fontChoice = typeof saved.fontChoice === "string" && saved.fontChoice.length <= 80 && !/[\x00-\x1f"\\]/.test(saved.fontChoice)
    ? saved.fontChoice.trim() : "";
  themeId = THEMES[saved.theme] ? saved.theme : "tokyo-night";
  applyTheme(THEMES[themeId]);

  // Single global PTY output stream, dispatched to the right pane by sessionId.
  await listen("pty-output", (e) => {
    const lf = leaves.get(e.payload.id);
    if (lf) lf.term.write(b64ToBytes(e.payload.data));
  });
  await listen("pty-exit", (e) => {
    const lf = leaves.get(e.payload.id);
    if (lf) {
      lf.term.write(`\r\n\x1b[38;5;245m[${tr("processExited")}]\x1b[0m\r\n`);
    }
  });

  explorerIntegrationAvailable = await invoke("explorer_integration_available").catch(() => false);
  explorerIntegration = explorerIntegrationAvailable
    ? await invoke("get_explorer_integration").catch(() => false)
    : false;
  buildProfileMenu();

  // Explorer "Open in Abergin" on an already-running instance → new tab there.
  await listen("open-cwd", (e) => {
    const dir = e.payload;
    if (dir) openCwdTab(dir).catch(() => {});
  });

  document.getElementById("new-tab").addEventListener("click", () => createTabInCurrentDirectory().catch(showError));
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => searchStep(false, true));
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchStep(event.shiftKey);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  });
  for (const [id, backward] of [["search-prev", true], ["search-next", false]]) {
    document.getElementById(id).addEventListener("click", () => {
      searchStep(backward);
      searchInput.focus();
    });
  }
  document.getElementById("search-close").addEventListener("click", () => closeSearch());

  // Live tab reordering while dragging a tab over the strip.
  $tabs.addEventListener("dragover", (e) => {
    const dragEl = $tabs.querySelector(".tab.dragging");
    if (!dragEl) return;
    e.preventDefault();
    const after = tabAfterPoint(e.clientX);
    if (after == null) $tabs.appendChild(dragEl);
    else $tabs.insertBefore(dragEl, after);
  });

  const pBtn = document.getElementById("profile-btn");
  const pMenu = document.getElementById("profile-menu");
  pBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setProfileMenuOpen(pMenu.classList.contains("hidden"));
    if (!pMenu.classList.contains("hidden") && e.detail === 0) {
      pMenu.querySelector("li[tabindex='0']")?.focus();
    }
  });
  document.addEventListener("click", () => {
    setProfileMenuOpen(false);
    closeCtxMenu();
  });

  // Custom context menus: tab menu on tabs, copy/paste/split menu in panes.
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest("input, textarea")) return;
    const tabEl = e.target.closest(".tab");
    if (tabEl) {
      e.preventDefault();
      showTabMenu(e.clientX, e.clientY, Number(tabEl.dataset.id));
      return;
    }
    const leafEl = e.target.closest(".leaf");
    if (leafEl && leafEl._leaf) {
      e.preventDefault();
      setActiveLeaf(leafEl._leaf); // right-click targets that pane
      showTermMenu(e.clientX, e.clientY);
    }
  });

  installShortcuts();

  // Window controls
  document.getElementById("win-min").addEventListener("click", () => appWindow.minimize());
  document.getElementById("win-max").addEventListener("click", () => appWindow.toggleMaximize());
  document.getElementById("win-close").addEventListener("click", () => {
    appWindow.close().catch(showError);
  });
  await appWindow.onCloseRequested(async () => {
    await flushState();
  });

  // Middle-click paste (Linux convention) — into the pane under the cursor.
  $panes.addEventListener("mousedown", (e) => {
    if (e.button !== 1) return;
    const lf = e.target.closest(".leaf")?._leaf ?? activeLeaf();
    if (!lf) return;
    e.preventDefault();
    setActiveLeaf(lf);
    pasteToLeaf(lf);
  });

  // Ctrl + mouse wheel — zoom text (terminal convention).
  $panes.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setFontSize(fontSize + (e.deltaY < 0 ? 1 : -1));
    },
    { passive: false },
  );

  // Re-fit on window resize and on display-scale (DPR) changes.
  window.addEventListener("resize", refitAll);
  const watchDpr = () => {
    refitAll();
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
      "change",
      watchDpr,
      { once: true },
    );
  };
  watchDpr();

  // Restore previous tabs (with their pane layouts), or open a default one.
  const savedTabs = Array.isArray(saved.tabs) ? saved.tabs : [];
  restoringState = true;
  try {
    if (savedTabs.length) {
      for (const ti of savedTabs) {
        if (!ti || typeof ti !== "object") {
          console.error("Skipping malformed saved tab:", ti);
          continue;
        }
        const prof = restoreProfile(
          ti.profile,
          config.profiles,
          sshConnections,
          sshPath,
          defaultProfile(),
        );
        try {
          await createTab(prof, ti.name ?? undefined, ti.layout, ti.activePane);
        } catch (error) {
          console.error(`Failed to restore tab "${ti.name ?? ti.profile ?? "unknown"}":`, error);
        }
      }
    }
  } catch (error) {
    console.error("Failed while restoring tabs:", error);
  } finally {
    restoringState = false;
  }
  // Launched from the Explorer context menu? Open (and focus) a tab there.
  const launchCwd = await invoke("take_launch_cwd").catch(() => null);
  if (launchCwd) {
    await openCwdTab(launchCwd).catch((error) =>
      console.error("Failed to open launch directory:", error),
    );
  }

  if (tabs.size === 0) {
    await createTab();
  } else {
    if (!launchCwd && Number.isInteger(saved.activeTab)) {
      const id = [...tabs.keys()][saved.activeTab];
      if (id != null) activate(id);
    }
    persistState();
  }
}

main().catch((error) => {
  console.error("Failed to start Abergin:", error);
  const message = document.createElement("pre");
  message.className = "fatal-error";
  message.textContent = `Abergin failed to start:\n${String(error)}`;
  document.body.appendChild(message);
});
