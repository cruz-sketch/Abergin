# Microsoft Store package

`build-msix.ps1` builds a separate full-trust MSIX package from the Tauri app.
It uses the Windows SDK's `MakeAppx.exe` and validates the resulting archive.
This package is **unsigned**; Partner Center signs accepted MSIX submissions.
It is not an installer for direct download. The existing NSIS build remains the
standalone distribution.

## Build for the 2PM Partner Center product

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName 2PM.Abergin `
  -Publisher 'CN=AC4705CC-2555-41FE-A23B-67E4210F8843' `
  -Architecture x64
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName 2PM.Abergin `
  -Publisher 'CN=AC4705CC-2555-41FE-A23B-67E4210F8843' `
  -Architecture arm64
```

Outputs: `store/out/2PM.Abergin_1.0.208.0_x64.msix` and
`store/out/2PM.Abergin_1.0.208.0_arm64.msix` for app version 0.2.8.
Build and package contents are under `store/out/` and ignored by Git.
GitHub Actions builds both architectures on every `v*` release tag and keeps
them as a `Abergin-Store-MSIX-unsigned` workflow artifact. It also attaches
them to the draft GitHub Release, alongside the standalone NSIS installer.
The release notes label the MSIX files as unsigned Store submission packages.
The **Store MSIX** workflow can be started manually to rebuild packages with
the Partner Center identity; the **Release** workflow can be started manually
to test both NSIS and MSIX builds without creating a GitHub Release.
The script builds with the Rust `store` feature and a separate Tauri identifier
(`com.abergin.terminal.store`). This keeps the Store and standalone apps from
interfering with each other's single-instance locks. On first launch the Store
app copies existing standalone settings and saved tabs, if present. It does
not modify the NSIS release build.

## Package identity

Partner Center expects **Package/Identity/Name** `2PM.Abergin`, **Package/Identity/
Publisher** `CN=AC4705CC-2555-41FE-A23B-67E4210F8843`, and package family
`2PM.Abergin_c2vw9vxzprnep`. The manifest name and publisher are
case-sensitive. `2PM` is the displayed publisher name; it does not replace the
GUID-based identity publisher. If Partner Center shows different values later,
copy its exact values into the build and workflow configuration.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName '2PM.Abergin' `
  -Publisher 'CN=AC4705CC-2555-41FE-A23B-67E4210F8843' `
  -PublisherDisplayName '2PM' `
  -Architecture x64
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName '2PM.Abergin' `
  -Publisher 'CN=AC4705CC-2555-41FE-A23B-67E4210F8843' `
  -PublisherDisplayName '2PM' `
  -Architecture arm64
```

Upload both architecture-specific MSIX files in the same Store submission;
Microsoft Store selects the applicable package for each device. ARM64 builds
can be cross-compiled on x64 Windows with the Rust ARM64 target and the Visual
Studio C++ ARM64 build tools installed.

MSIX package versions use `1.<app major>.<app minor * 100 + patch>.0`, because
the first component must be nonzero and Microsoft Store reserves the fourth.
Patch versions from 0 to 99 are supported. Increase the app version before
each Store update.

## Store-specific behavior

The Store build does not expose the Explorer context-menu toggle. That feature
currently uses per-user registry entries, which MSIX does not reliably expose
to Explorer and which could leave stale paths after package updates. Tabs,
split panes, settings, shell profiles, and SSH remain in the Store build.

The app needs a full-trust desktop process to launch user-selected local shells
through ConPTY and the Windows OpenSSH client. The manifest declares only
`runFullTrust`, with Windows 10 version 2004 (19041) as its minimum.

## Pre-submission checks

1. Build both packages with the real Partner Center identity.
2. Verify that `MakeAppx` finishes without errors and inspect the generated
   `store/out/verify/x64/AppxManifest.xml` and
   `store/out/verify/arm64/AppxManifest.xml`.
3. Test an installed package on a clean Windows 10/11 machine with WebView2
   Runtime available (it is preinstalled on Windows 11 and most Windows 10
   devices):
   PowerShell, PowerShell 7, Git Bash, CMD, WSL, SSH, tab restoration, copy/paste,
   settings, and a package update.
4. Check the Store listing in `listing.md`, current screenshots, and public
   `PRIVACY.md` URL.
5. Upload both MSIX files to Partner Center and complete its automated validation.

Microsoft references: [manual MSIX packaging](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion), [package requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements), [Store submission checklist](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/create-app-submission).
