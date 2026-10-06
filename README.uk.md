<h1 align="center">Abergin</h1>

<p align="center">
  Швидкий сучасний термінал для Windows — вкладки, split-панелі, SSH-профілі й теми.<br>
  Збудований на <strong>Tauri 2 (Rust)</strong> + <strong>xterm.js</strong>.
</p>

<p align="center">
  <a href="https://github.com/cruz-sketch/Abergin/releases"><img src="https://img.shields.io/github/v/release/cruz-sketch/Abergin?include_prereleases&label=release" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white" alt="Tauri 2">
  <img src="https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white" alt="Rust">
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>Українська</strong>
</p>

Стильний нативний термінал для Windows у дусі дефолтної консолі Linux / Ghostty.
Працює напряму через ConPTY (`portable-pty`) і лишається маленьким
(інсталятор ~1.3 МБ), бо використовує системний WebView2, а не вбудований Chromium.

## Скріншоти

<p align="center">
  <img src="docs/screenshot-split-panes.png" width="100%" alt="Split-панелі: htop, файловий менеджер і SSH-сесія в одній вкладці">
</p>
<p align="center">
  <img src="docs/screenshot-menu.png" width="49%" alt="Меню профілів, SSH-підключень і тем">
  <img src="docs/screenshot-context-menu.png" width="49%" alt="Контекстне меню панелі">
</p>
<p align="center">
  <img src="docs/screenshot-monitoring.png" width="100%" alt="Моніторинг системи з повною підтримкою 256 кольорів">
</p>

## Можливості

- **Профілі** — автодетект PowerShell, PowerShell 7, Git Bash, WSL, Command Prompt.
  Зберігаються у `%APPDATA%\com.abergin.terminal\config.json` (редагується через Налаштування → Додатково).
- **Bash-комбінації** — PowerShell стартує в `EditMode Emacs`, тож працюють
  `Ctrl+W`, `Ctrl+A/E`, `Ctrl+U/K`, `Ctrl+R` (пошук в історії), `Alt+B/F`.
  У Git Bash / WSL — нативно.
- **Історія команд** — на рівні шелу (PSReadLine/readline) + скролбек 10000 рядків.
- **Вкладки** — кілька сесій, перейменування (подвійний клік / меню), **drag-and-drop**
  для зміни порядку. Вкладки, активні панелі й початкові директорії відновлюються між запусками.
  PowerShell, Git Bash, Command Prompt і WSL повідомляють про зміну директорії,
  тож після `cd` вкладка відновиться там. `Ctrl+Shift+T` і кнопка + відкривають
  нову вкладку з профілем і директорією активної панелі.
- **Split-панелі** — вкладка ділиться на дерево панелей (як tmux / Windows Terminal),
  кожна — окрема сесія; роздільники тягнуться мишею; розкладка зберігається.
- **SSH-менеджер** — зберігай і редагуй підключення (хост/користувач/порт/ключ) та підключайся
  одним кліком; використовує вбудований Windows OpenSSH.
- **Інтеграція з Провідником** — клік правою кнопкою по теці (або всередині неї / на
  диску) → **«Open in Abergin»**, і термінал відкривається вже в цій директорії.
  Вмикається/вимикається в Налаштуваннях (запис у `HKCU`, без прав адміністратора).
- **Select-to-copy** + вставка середньою кнопкою (як у Linux).
- **Налаштування у вікні** — мова, тема, шрифт, його розмір та інтеграція з
  Провідником; додаткові параметри доступні через `config.json`. Шрифт має бути
  встановлений у Windows; можна вказати власну назву.
- **Пошук** — `Ctrl+Shift+F` шукає текст у виводі активної панелі. `Enter` і
  `Shift+Enter` переходять між збігами.
- **Теми** — 6 вбудованих (Tokyo Night, Dracula, Gruvbox Dark, Nord, One Dark,
  Solarized Light); змінюють увесь інтерфейс.
- **Рендеринг** — типовий DOM-рендерер стабільно відображає текст у програмах, що
  часто перемальовують екран. Для GPU-рендерингу встанови `"renderer": "webgl"` у `config.json`.
- **Масштаб тексту** — `Ctrl +/-/0` або `Ctrl`+колесо.
- **Багатомовність** — 14 мов: українська, English, Deutsch, Français, Español,
  Polski, Čeština, Lietuvių, Latviešu, Eesti, Norsk, Română (Moldova),
  Azərbaycan, 日本語. При першому запуску мова визначається з локалі ОС
  (інакше — англійська); потім її можна змінити в Налаштуваннях.
- **Довідка** — `F1`.
- **Вигляд** — frameless-вікно, кастомний титлбар, суцільний фон (без acrylic — він
  лагає при перетягуванні на Windows 10).

## Гарячі клавіші

| Клавіші | Дія |
|---|---|
| `Ctrl+Shift+T` | нова вкладка в директорії активної панелі |
| `Ctrl+Shift+W` | закрити панель (остання → вкладку) |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | перемикання вкладок |
| `Alt+1…9` | перейти на N-ту вкладку |
| `Ctrl+Shift+D` / `Ctrl+Shift+E` | розділити панель праворуч / вниз |
| `Alt+←↑↓→` | перехід між панелями |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | копіювати / вставити |
| `Ctrl+Shift+F` | пошук у виводі активної панелі за будь-якої розкладки |
| `Ctrl + =` / `Ctrl + -` / `Ctrl + 0` | масштаб тексту |
| `F1` | довідка |
| середня кнопка миші | вставити |

> Решта комбінацій (`Ctrl+W`, `Ctrl+A`, `Ctrl+R`…) передаються в шел.

## Розробка та збірка

```powershell
npm install
npm test               # тести відновлення сесій
npm run tauri dev      # режим розробки (Vite + Rust, відкриває вікно)
npm run tauri build    # інсталятор → src-tauri\target\release\bundle\nsis\
```

> **Тулчейн:** збірка вимагає **MSVC** (лінкер із Visual Studio). Зафіксовано в
> `rust-toolchain.toml`. Дефолтний `gnu`-тулчейн ламає збірку Tauri
> (`error: export ordinal too large`). Потрібні також Node і WebView2 (попередньо встановлений у Windows 11 та на більшості пристроїв із Windows 10).

## Цифровий підпис (опціонально)

Інструкція зі збирання MSIX для Microsoft Store — у
[store/README.md](store/README.md). Також доступна
[політика приватності](PRIVACY.md).

Звичайна збірка `npm run tauri build` **не підписує** нічого і працює без
сертифіката — тож зібрати може будь-хто.

Щоб підписати `.exe` та інсталятор:

1. Скопіюй `src-tauri/tauri.signing.conf.example.json` →
   `src-tauri/tauri.signing.conf.json` (цей файл у `.gitignore`).
2. Впиши `certificateThumbprint` свого сертифіката (з `Cert:\CurrentUser\My`).
3. Збери:

   ```powershell
   npm run tauri:build:signed
   ```

Для тесту згодиться self-signed сертифікат (`New-SelfSignedCertificate -Type
CodeSigningCert`), валідний лише на машинах, де його додано в Trusted Root. Щоб
прибрати SmartScreen на чужих ПК — потрібен справжній сертифікат (Azure Trusted
Signing / OV / EV).

## Релізи

Пуш тегу `v*` запускає GitHub Actions (`.github/workflows/release.yml`), який
збирає (непідписаний) інсталятор і кладе його в **чернетку** GitHub Release. Щоб
зробити реліз — підніми версію в `package.json`, `src-tauri/Cargo.toml` і
`src-tauri/tauri.conf.json`, потім:

```powershell
git tag vX.Y.Z
git push github vX.Y.Z
```

Перевір чернетку релізу на GitHub і опублікуй.

## Дані застосунку

`%APPDATA%\com.abergin.terminal\`
- `config.json` — профілі, шрифт, базова тема.
- `state.json` — відкриті вкладки, розкладка й директорії панелей, активна вкладка/панель,
  SSH-підключення, мова, поточна тема, розмір шрифту.

## Структура

```
index.html, src/main.js, src/style.css  — фронтенд (xterm.js, UI, вкладки/панелі,
                                            гарячі клавіші, теми, i18n, SSH, довідка)
src-tauri/src/pty.rs       — ConPTY-сесії (spawn / read / write / resize / close)
src-tauri/src/config.rs    — профілі та config.json
src-tauri/src/state.rs     — state.json (get_state / save_state), шлях до ssh.exe
src-tauri/src/lib.rs       — точка входу Tauri, реєстрація команд
src-tauri/tauri.conf.json  — вікно та налаштування бандла
```

## Ліцензія

[MIT](LICENSE) © 2026 Cruz
