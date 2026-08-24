# codex-dsh-routing-suite uninstall script for Codex.
# Removes the config.toml marker blocks and the installed runtime/skill.
$ErrorActionPreference = 'Stop'

$homeDir = $env:USERPROFILE
if (-not $homeDir) { throw 'USERPROFILE is not set' }
$codexHome = Join-Path $homeDir '.codex'
$configPath = Join-Path $codexHome 'config.toml'
$dst = Join-Path $codexHome 'codex-dsh-routing-suite'
$skillDst = Join-Path $codexHome 'skills\codex-dsh-routing-suite'
$prevDst = Join-Path $codexHome 'codex-deepseek-routing-suite'
$prevSkillDst = Join-Path $codexHome 'skills\codex-deepseek-routing-suite'
$oldDst = Join-Path $codexHome 'routing-suite'
$oldSkillDst = Join-Path $codexHome 'skills\dsh-router'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

Write-Host '[1/3] Cleaning config.toml'
if (Test-Path -LiteralPath $configPath) {
  $backup = "$configPath.bak-$stamp"
  Copy-Item -LiteralPath $configPath -Destination $backup -Force
  Write-Host "  backup: $backup"
  $text = Get-Content -Raw -LiteralPath $configPath
  foreach ($label in @('codex-dsh-routing-suite', 'codex-deepseek-routing-suite', 'dsh-router')) {
    foreach ($marker in @('hooks', 'mcp', 'instructions')) {
      $begin = "# >>> ${label} ${marker}: begin >>>"
      $end = "# >>> ${label} ${marker}: end <<<"
      $pattern = [regex]::Escape($begin) + '.*?' + [regex]::Escape($end) + '\s*'
      $text = [regex]::Replace($text, $pattern, '', [Text.RegularExpressions.RegexOptions]::Singleline)
    }
  }
  # Remove leftover blank lines left behind by removed marker blocks.
  $text = $text -replace '\n{3,}', "`n`n"
  $text = $text -replace '^\n+', ''
  Set-Content -LiteralPath $configPath -Value ($text.TrimEnd() + "`n") -Encoding UTF8
}

Write-Host '[2/4] Removing native agents (router_* only)'
$agentsDst = Join-Path $codexHome 'agents'
foreach ($agent in @('router-spec.toml', 'router-react.toml', 'router-weak.toml')) {
  $agentPath = Join-Path $agentsDst $agent
  if (Test-Path -LiteralPath $agentPath) {
    Remove-Item -LiteralPath $agentPath -Force
  }
}

Write-Host '[3/4] Removing runtime and skill'
$codexHomeFull = [IO.Path]::GetFullPath($codexHome)
foreach ($target in @($dst, $skillDst, $prevDst, $prevSkillDst, $oldDst, $oldSkillDst)) {
  if (Test-Path -LiteralPath $target) {
    $resolved = [IO.Path]::GetFullPath($target)
    if (-not $resolved.StartsWith($codexHomeFull, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove path outside $codexHomeFull"
    }
    $targetItem = Get-Item -LiteralPath $resolved -Force
    if ($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      # Pre-existing link: remove the link only, keep its target.
      Remove-Item -LiteralPath $resolved -Force
    } else {
      Remove-Item -LiteralPath $resolved -Recurse -Force
    }
  }
}

Write-Host '[4/4] Done. Restart Codex. Config backup kept for recovery.'
