# codex-deepseek-routing-suite install script for Codex (user-level direct install).
# Usage: .\install.ps1
$ErrorActionPreference = 'Stop'

function Get-CodexCli {
  $envCli = $env:CODEX_CLI_PATH
  if ($envCli -and (Test-Path -LiteralPath $envCli)) { return $envCli }
  $binRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
  if (Test-Path -LiteralPath $binRoot) {
    $candidates = Get-ChildItem -LiteralPath $binRoot -Directory | Sort-Object LastWriteTime -Descending
    foreach ($d in $candidates) {
      $exe = Join-Path $d.FullName 'codex.exe'
      if (Test-Path -LiteralPath $exe) { return $exe }
    }
  }
  $cmd = Get-Command codex -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Set-MarkerBlock {
  param([string]$Text, [string]$Label, [string]$Marker, [string]$Block, [switch]$InsertTop)
  $begin = "# >>> ${Label} ${Marker}: begin >>>"
  $end = "# >>> ${Label} ${Marker}: end <<<"
  $trimmed = $Block.TrimEnd()
  if ($Text.Contains($begin)) {
    # Consume the trailing whitespace left after the old end marker so
    # repeated installs do not accumulate blank lines in config.toml.
    $pattern = [regex]::Escape($begin) + '.*?' + [regex]::Escape($end) + '\s*'
    $Text = [regex]::Replace($Text, $pattern, $trimmed + "`n`n", [Text.RegularExpressions.RegexOptions]::Singleline)
  } elseif ($InsertTop) {
    # Top-level keys must stay above the first [section]; inserting at the
    # end would attach them to the last TOML table.
    $lines = $Text -split "`r?`n"
    $pos = 0
    for ($i = 0; $i -lt $lines.Length; $i++) {
      if ($lines[$i].TrimStart().StartsWith('[')) { $pos = $i; break }
    }
    $head = if ($pos -gt 0) { $lines[0..($pos - 1)] } else { @() }
    $keep = if ($pos -lt $lines.Length) { $lines[$pos] } else { '' }
    $tail = if ($pos + 1 -lt $lines.Length) { $lines[($pos + 1)..($lines.Length - 1)] } else { @() }
    $lines = $head + @('') + @($trimmed) + @('') + @($keep) + $tail
    $Text = $lines -join "`n"
    if (-not $Text.EndsWith("`n")) { $Text += "`n" }
  } else {
    $Text = $Text.TrimEnd() + "`n`n" + $trimmed + "`n"
  }
  return $Text
}

function Remove-MarkerBlock {
  param([string]$Text, [string]$Label, [string]$Marker)
  $begin = "# >>> ${Label} ${Marker}: begin >>>"
  $end = "# >>> ${Label} ${Marker}: end <<<"
  $pattern = [regex]::Escape($begin) + '.*?' + [regex]::Escape($end) + '\s*'
  return [regex]::Replace($Text, $pattern, '', [Text.RegularExpressions.RegexOptions]::Singleline)
}

function Merge-ConfigToml {
  param([string]$ConfigPath, [string]$RuntimeDir)
  $toml = ''
  if (Test-Path -LiteralPath $ConfigPath) { $toml = Get-Content -Raw -LiteralPath $ConfigPath }
  if ($null -eq $toml) { $toml = '' }
  $fs = $RuntimeDir.Replace('\', '/')
  $label = 'codex-deepseek-routing-suite'

  $hooksBlock = @"
# >>> ${label} hooks: begin >>>
[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "node $fs/hooks/router-user-prompt.mjs"
command_windows = "node $fs/hooks/router-user-prompt.mjs"
timeout = 10
additionalContextLimit = 4096

[[hooks.PreToolUse]]
matcher = "*"
[[hooks.PreToolUse.hooks]]
type = "command"
command = "node $fs/hooks/router-pre-tool.mjs"
command_windows = "node $fs/hooks/router-pre-tool.mjs"
timeout = 10
# >>> ${label} hooks: end <<<
"@

  $mcpBlock = @"
# >>> ${label} mcp: begin >>>
[mcp_servers.${label}]
type = "stdio"
command = "node"
args = ["$fs/mcp/server.mjs"]
startup_timeout_sec = 30
tool_timeout_sec = 120
# >>> ${label} mcp: end <<<
"@

  $instructionsBlock = @"
# >>> ${label} instructions: begin >>>
model_instructions_file = "$fs/instructions/base.md"
# >>> ${label} instructions: end <<<
"@

  # Remove legacy dsh-router marker blocks from older installs.
  foreach ($marker in @('hooks', 'mcp', 'instructions')) {
    $toml = Remove-MarkerBlock -Text $toml -Label 'dsh-router' -Marker $marker
  }
  $toml = Set-MarkerBlock -Text $toml -Label $label -Marker 'hooks' -Block $hooksBlock
  $toml = Set-MarkerBlock -Text $toml -Label $label -Marker 'mcp' -Block $mcpBlock
  # Persona replacement via model_instructions_file is the only form
  # (closest to the original dsh-router-standard semantics).
  $toml = Set-MarkerBlock -Text $toml -Label $label -Marker 'instructions' -Block $instructionsBlock -InsertTop
  # Safety net: collapse any 3+ newline runs and keep a single trailing newline.
  $toml = $toml -replace '\n{3,}', "`n`n"
  $toml = $toml -replace '^\n+', ''
  $toml = $toml.TrimEnd() + "`n"
  Set-Content -LiteralPath $ConfigPath -Value $toml -Encoding UTF8
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$homeDir = $env:USERPROFILE
if (-not $homeDir) { throw 'USERPROFILE is not set' }
$codexHome = Join-Path $homeDir '.codex'
$dst = Join-Path $codexHome 'codex-deepseek-routing-suite'
$skillDst = Join-Path $codexHome 'skills\codex-deepseek-routing-suite'
$oldDst = Join-Path $codexHome 'routing-suite'
$oldSkillDst = Join-Path $codexHome 'skills\dsh-router'
$configPath = Join-Path $codexHome 'config.toml'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

Write-Host '[1/6] Backing up config.toml'
if (Test-Path -LiteralPath $configPath) {
  $backup = "$configPath.bak-$stamp"
  Copy-Item -LiteralPath $configPath -Destination $backup -Force
  Write-Host "  backup: $backup"
}

Write-Host '[1.5/7] Migrating legacy layout (dsh-router -> codex-deepseek-routing-suite)'
if ((Test-Path -LiteralPath $oldDst) -and -not (Test-Path -LiteralPath $dst)) {
  Move-Item -LiteralPath $oldDst -Destination $dst
  Write-Host "  moved $oldDst -> $dst"
} elseif (Test-Path -LiteralPath $oldDst) {
  Remove-Item -LiteralPath $oldDst -Recurse -Force
  Write-Host "  removed stale $oldDst"
}
if (Test-Path -LiteralPath $oldSkillDst) {
  Remove-Item -LiteralPath $oldSkillDst -Recurse -Force
  Write-Host "  removed stale $oldSkillDst"
}

Write-Host "[2/6] Copying runtime to $dst"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
foreach ($sub in @('hooks', 'mcp', 'instructions', 'test', 'personas', 'tmp', 'state', 'latest', 'agents')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $dst $sub) | Out-Null
}
Copy-Item -LiteralPath (Join-Path $root 'router-core.mjs') -Destination $dst -Force
Copy-Item -LiteralPath (Join-Path $root 'install.mjs') -Destination $dst -Force
Copy-Item -LiteralPath (Join-Path $root 'uninstall.mjs') -Destination $dst -Force
Copy-Item -Path (Join-Path $root 'hooks\*.mjs') -Destination (Join-Path $dst 'hooks') -Force
Copy-Item -LiteralPath (Join-Path $root 'mcp\server.mjs') -Destination (Join-Path $dst 'mcp') -Force
Copy-Item -LiteralPath (Join-Path $root 'instructions\base.md') -Destination (Join-Path $dst 'instructions') -Force
Copy-Item -Path (Join-Path $root 'test\*.mjs') -Destination (Join-Path $dst 'test') -Force

Write-Host "[3/6] Installing skill to $skillDst"
$skillsRoot = Join-Path $codexHome 'skills'
if (-not (Test-Path -LiteralPath $skillsRoot)) {
  New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null
}
if (Test-Path -LiteralPath $skillDst) {
  $resolved = [IO.Path]::GetFullPath($skillDst)
  $resolvedRoot = [IO.Path]::GetFullPath($skillsRoot)
  if (-not $resolved.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove skill outside $skillsRoot"
  }
  $skillItem = Get-Item -LiteralPath $resolved -Force
  if ($skillItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    # A pre-existing link (e.g. from another manager): remove the link only,
    # never follow it into its target.
    Remove-Item -LiteralPath $resolved -Force
  } else {
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
New-Item -ItemType Directory -Force -Path $skillDst | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'skills\codex-deepseek-routing-suite\SKILL.md') -Destination (Join-Path $skillDst 'SKILL.md') -Force
New-Item -ItemType Directory -Force -Path (Join-Path $skillDst 'references') | Out-Null
Copy-Item -Path (Join-Path $root 'skills\codex-deepseek-routing-suite\references\*') -Destination (Join-Path $skillDst 'references') -Recurse -Force

Write-Host '[4/7] Installing native agents (optional backend; multi_agent stays off)'
$agentsDst = Join-Path $codexHome 'agents'
New-Item -ItemType Directory -Force -Path $agentsDst | Out-Null
foreach ($agent in @('router-spec.toml', 'router-react.toml', 'router-weak.toml')) {
  Copy-Item -LiteralPath (Join-Path $root "agents\$agent") -Destination (Join-Path $agentsDst $agent) -Force
}
Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination (Join-Path $dst 'agents') -Force

Write-Host '[5/7] Writing config.json'
$cfgPath = Join-Path $dst 'config.json'
$cfg = @{}
if (Test-Path -LiteralPath $cfgPath) {
  try { $cfg = Get-Content -Raw -LiteralPath $cfgPath | ConvertFrom-Json -AsHashtable } catch { $cfg = @{} }
}
$cfg['anchoring'] = $true
if (-not $cfg.ContainsKey('routerMode')) { $cfg['routerMode'] = 'standard' }
if (-not $cfg.ContainsKey('specExtraTools')) { $cfg['specExtraTools'] = @() }
if (-not $cfg.ContainsKey('reactExtraTools')) { $cfg['reactExtraTools'] = @() }
$cfg['codexCli'] = Get-CodexCli
$cfg | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $cfgPath -Encoding UTF8

Write-Host '[6/7] Merging config.toml'
Merge-ConfigToml -ConfigPath $configPath -RuntimeDir $dst

Write-Host '[7/7] Done'
Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Restart Codex (desktop app or CLI).'
Write-Host '  2. Trust the two new hooks (CLI: codex /hooks; desktop: trust prompt).'
Write-Host '  3. Open a new session and call dev_router_status to verify.'
Write-Host '  model_instructions_file persona replacement is active (the only form).'
