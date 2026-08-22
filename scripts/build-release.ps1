# Builds the publishable release zip for codex-deepseek-routing-suite.
# Usage: .\scripts\build-release.ps1 [-Version 0.1.0]
param(
  [string]$Version = '0.1.1',
  [string]$Repo = (Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent)
)
$ErrorActionPreference = 'Stop'

$TopLevel = 'codex-deepseek-routing-suite'
$repoRoot = [IO.Path]::GetFullPath($Repo)
$distDir = Join-Path $repoRoot 'dist'
$staging = Join-Path $distDir "staging-$Version"
$pkgDir = Join-Path $staging $TopLevel
$zip = Join-Path $distDir "$TopLevel-v$Version.zip"

if (Test-Path -LiteralPath $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $pkgDir | Out-Null

$include = @(
  'hooks', 'mcp', 'skills', 'agents', 'instructions', 'test', 'docs',
  'README.md', 'README.en.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md',
  'install.ps1', 'uninstall.ps1', 'install.mjs', 'uninstall.mjs'
)
foreach ($item in $include) {
  $src = Join-Path $repoRoot $item
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination $pkgDir -Recurse -Force
  }
}

$privateDoc = Join-Path $pkgDir 'codex-routing-suite-移植方案.md'
if (Test-Path -LiteralPath $privateDoc) {
  Remove-Item -LiteralPath $privateDoc -Force
}

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}
Compress-Archive -Path $pkgDir -DestinationPath $zip -CompressionLevel Optimal
Remove-Item -LiteralPath $staging -Recurse -Force

Write-Host "Built $zip"
