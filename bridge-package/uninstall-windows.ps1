$ErrorActionPreference = "Stop"
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Online4Tech Smart Manager Bridge.lnk"
$installDir = Join-Path $env:LOCALAPPDATA "Programs\Online4Tech\SmartManagerBridge"
if (Test-Path $shortcutPath) { Remove-Item -Force $shortcutPath }
if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
Write-Host "Startup shortcut and bridge program removed."
Write-Host "The local trust file is retained. Remove it manually only if you also want to reset this computer's local trust."
