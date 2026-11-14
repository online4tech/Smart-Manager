$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "Online4TechBridge.exe"
if (-not (Test-Path $source)) { throw "Online4TechBridge.exe is missing. Extract the complete package first." }

$installDir = Join-Path $env:LOCALAPPDATA "Programs\Online4Tech\SmartManagerBridge"
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Online4Tech Smart Manager Bridge.lnk"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Copy-Item -Force $source (Join-Path $installDir "Online4TechBridge.exe")
$registrySource = Join-Path $PSScriptRoot "approved-packages.json"
if (-not (Test-Path $registrySource)) { throw "approved-packages.json is missing. Extract the complete package first." }
Copy-Item -Force $registrySource (Join-Path $installDir "approved-packages.json")

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $installDir "Online4TechBridge.exe"
$shortcut.WorkingDirectory = $installDir
$shortcut.Description = "Online4Tech Smart Manager local background bridge"
$shortcut.Save()

Start-Process -FilePath (Join-Path $installDir "Online4TechBridge.exe")
Write-Host "Online4Tech Bridge installed and started in the background."
Write-Host "It will start automatically when this Windows user signs in."
Write-Host "No Windows service, administrator permission, password, or pairing code is required."
