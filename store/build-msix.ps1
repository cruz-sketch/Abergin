param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9.-]{2,49}$')]
    [string]$IdentityName,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Publisher,

    [string]$PublisherDisplayName = 'Abergin',

    [ValidateSet('x64', 'arm64')]
    [string]$Architecture = 'x64'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($IdentityName.EndsWith('.')) { throw 'MSIX package identity cannot end with a period.' }
$outDir = Join-Path $PSScriptRoot 'out'
$stageDir = Join-Path $outDir "stage/$Architecture"
$verifyDir = Join-Path $outDir "verify/$Architecture"
$env:CARGO_TARGET_DIR = Join-Path $projectRoot 'src-tauri/target-store'
$rustTarget = if ($Architecture -eq 'arm64') { 'aarch64-pc-windows-msvc' } else { 'x86_64-pc-windows-msvc' }

function Reset-ChildDirectory([string]$Path) {
    $resolved = [IO.Path]::GetFullPath($Path)
    $allowed = [IO.Path]::GetFullPath($outDir).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a directory outside $outDir"
    }
    if (Test-Path -LiteralPath $resolved) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
    New-Item -ItemType Directory -Path $resolved -Force | Out-Null
}

function Escape-Xml([string]$Value) {
    return [Security.SecurityElement]::Escape($Value)
}

function Get-PeMachine([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    $reader = [IO.BinaryReader]::new($stream)
    try {
        if ($reader.ReadUInt16() -ne 0x5A4D) { throw "Not a PE executable: $Path" }
        $stream.Position = 0x3C
        $headerOffset = $reader.ReadInt32()
        if ($headerOffset -lt 64 -or $headerOffset -gt $stream.Length - 6) {
            throw "Invalid PE header: $Path"
        }
        $stream.Position = $headerOffset
        if ($reader.ReadUInt32() -ne 0x00004550) { throw "Invalid PE signature: $Path" }
        return $reader.ReadUInt16()
    } finally {
        $reader.Dispose()
        $stream.Dispose()
    }
}

$config = Get-Content -LiteralPath (Join-Path $projectRoot 'src-tauri/tauri.conf.json') -Raw | ConvertFrom-Json
if ($config.version -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
    throw 'The Tauri version must be a three-part numeric version.'
}
$major = [int]$Matches[1]
$minor = [int]$Matches[2]
$patch = [int]$Matches[3]
if ($major -gt 65535 -or $minor -gt 655 -or $patch -gt 99) {
    throw 'The app version exceeds the MSIX version mapping (1.major.minor*100+patch.0).'
}
# The first MSIX component cannot be zero and the fourth is reserved for Store.
$msixVersion = "1.$major.$($minor * 100 + $patch).0"

$sdkRoot = Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Windows Kits/10/bin'
$sdk = Get-ChildItem -LiteralPath $sdkRoot -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'x64/makeappx.exe') } |
    Select-Object -First 1
if (-not $sdk) { throw 'Windows SDK MakeAppx.exe (x64) was not found.' }
$makeAppx = Join-Path $sdk.FullName 'x64/makeappx.exe'

Push-Location $projectRoot
try {
    $buildArgs = @('run', 'tauri', '--', 'build', '--no-bundle', '--features', 'store',
        '--config', 'src-tauri/tauri.store.conf.json')
    if ($Architecture -eq 'arm64') { $buildArgs += @('--target', $rustTarget) }
    & npm @buildArgs
    if ($LASTEXITCODE -ne 0) { throw 'Tauri Store build failed.' }
} finally {
    Pop-Location
}

$binary = if ($Architecture -eq 'arm64') {
    Join-Path $env:CARGO_TARGET_DIR "$rustTarget/release/abergin.exe"
} else {
    Join-Path $env:CARGO_TARGET_DIR 'release/abergin.exe'
}
if (-not (Test-Path -LiteralPath $binary)) { throw "Missing application binary: $binary" }
$expectedMachine = if ($Architecture -eq 'arm64') { 0xAA64 } else { 0x8664 }
if ((Get-PeMachine $binary) -ne $expectedMachine) {
    throw "The built executable is not $Architecture; refusing to label it as an $Architecture package."
}

New-Item -ItemType Directory -Path $outDir -Force | Out-Null
Reset-ChildDirectory $stageDir
Reset-ChildDirectory $verifyDir
Copy-Item -LiteralPath $binary -Destination (Join-Path $stageDir 'Abergin.exe')
$assetsDir = Join-Path $stageDir 'Assets'
New-Item -ItemType Directory -Path $assetsDir | Out-Null
foreach ($name in @('StoreLogo.png', 'Square150x150Logo.png', 'Square44x44Logo.png')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "src-tauri/icons/$name") -Destination (Join-Path $assetsDir $name)
}

$identityXml = Escape-Xml $IdentityName
$publisherXml = Escape-Xml $Publisher
$publisherDisplayXml = Escape-Xml $PublisherDisplayName
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:uap10="http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">
  <Identity Name="$identityXml" Publisher="$publisherXml" Version="$msixVersion" ProcessorArchitecture="$Architecture" />
  <Properties>
    <DisplayName>Abergin</DisplayName>
    <PublisherDisplayName>$publisherDisplayXml</PublisherDisplayName>
    <Description>Abergin terminal for Windows</Description>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Resources>
    <Resource Language="en-us" />
    <Resource Language="uk-ua" />
  </Resources>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Applications>
    <Application Id="Abergin" Executable="Abergin.exe"
                 uap10:RuntimeBehavior="packagedClassicApp" uap10:TrustLevel="mediumIL">
      <uap:VisualElements DisplayName="Abergin" Description="Abergin terminal for Windows"
                          Square150x150Logo="Assets\Square150x150Logo.png"
                          Square44x44Logo="Assets\Square44x44Logo.png" BackgroundColor="#1a1b26" />
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
"@
$manifestPath = Join-Path $stageDir 'AppxManifest.xml'
[IO.File]::WriteAllText($manifestPath, $manifest, [Text.UTF8Encoding]::new($false))

$packagePath = Join-Path $outDir ("{0}_{1}_{2}.msix" -f $IdentityName, $msixVersion, $Architecture)
& $makeAppx pack /o /h SHA256 /d $stageDir /p $packagePath
if ($LASTEXITCODE -ne 0) { throw 'MakeAppx package validation failed.' }
& $makeAppx unpack /p $packagePath /d $verifyDir
if ($LASTEXITCODE -ne 0) { throw 'MakeAppx package verification failed.' }
if ((Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash -ne
    (Get-FileHash -LiteralPath (Join-Path $verifyDir 'Abergin.exe') -Algorithm SHA256).Hash) {
    throw 'The packaged executable differs from the build output.'
}

Write-Host "MSIX ready: $packagePath"
Write-Host "Version: $msixVersion (app $($config.version))"
Write-Host 'Package is unsigned. Partner Center re-signs submitted MSIX packages.'
