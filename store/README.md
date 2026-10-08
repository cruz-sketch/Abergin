# Microsoft Store package

`build-msix.ps1` builds a separate full-trust MSIX package from the Tauri app.
It uses the Windows SDK's `MakeAppx.exe` and validates the resulting archive.
This package is **unsigned**; Partner Center signs accepted MSIX submissions.
It is not an installer for direct download. The existing NSIS build remains the
standalone distribution.

## Build before Partner Center is ready

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName Abergin.Terminal.Local `
  -Publisher 'CN=Abergin Local' `
  -Architecture x64
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName Abergin.Terminal.Local `
  -Publisher 'CN=Abergin Local' `
  -Architecture arm64
```

Outputs: `store/out/Abergin.Terminal.Local_1.0.204.0_x64.msix` and
`store/out/Abergin.Terminal.Local_1.0.204.0_arm64.msix` for app version 0.2.4.
Build and package contents are under `store/out/` and ignored by Git.
GitHub Actions builds both architectures on every `v*` release tag and keeps
them as a `Abergin-Store-MSIX-unsigned` workflow artifact. It also attaches
them to the draft GitHub Release, alongside the standalone NSIS installer.
The release notes label the MSIX files as unsigned Store submission packages.
The **Store MSIX** workflow can be started manually with the exact Partner
Center identity once it is available; the **Release** workflow can be started
manually to test both NSIS and placeholder-identity MSIX builds without
creating a GitHub Release.
The script builds with the Rust `store` feature and a separate Tauri identifier
(`com.abergin.terminal.store`). This keeps the Store and standalone apps from
interfering with each other's single-instance locks. On first launch the Store
app copies existing standalone settings and saved tabs, if present. It does
not modify the NSIS release build.

## Final package identity

After reserving Abergin in Partner Center, open **Product management → Product
identity** and copy the exact **Package/Identity/Name** and **Package/Identity/
Publisher** values. Both are case-sensitive. Rebuild with those values; do not
upload a package created with the local placeholder identity.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName '<Package/Identity/Name>' `
  -Publisher '<Package/Identity/Publisher>' `
  -PublisherDisplayName '<publisher shown to users>' `
  -Architecture x64
powershell -NoProfile -ExecutionPolicy Bypass -File store/build-msix.ps1 `
  -IdentityName '<Package/Identity/Name>' `
  -Publisher '<Package/Identity/Publisher>' `
  -PublisherDisplayName '<publisher shown to users>' `
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
