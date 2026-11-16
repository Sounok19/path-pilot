$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$pidFile = Join-Path $projectRoot '.local/cloudflare/app.pid'
if (Test-Path -LiteralPath $pidFile) {
  $demoProcessId = [int](Get-Content -LiteralPath $pidFile)
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$demoProcessId"
  if ($process) {
    if ($process.Name -ne 'node.exe' -or $process.CommandLine -notmatch 'scripts[/\\]cloud-demo\.mjs') {
      throw 'The saved process ID belongs to another program. Restart the app manually.'
    }
    Stop-Process -Id $demoProcessId -ErrorAction Stop
    Wait-Process -Id $demoProcessId -Timeout 10 -ErrorAction SilentlyContinue
  }
}
& "$PSScriptRoot/start-local-database.ps1"
$replacement = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'scripts/cloud-demo.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/cloudflare/app.log' -RedirectStandardError '.local/cloudflare/app-error.log'
$replacement.Id | Set-Content -LiteralPath $pidFile
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  if ($replacement.HasExited) { throw 'App startup failed. Check .local/cloudflare/app-error.log.' }
  try {
    $health = Invoke-WebRequest 'http://127.0.0.1:3002/api/health' -UseBasicParsing -TimeoutSec 2
    if ($health.StatusCode -eq 200) {
      Write-Host 'Updated app ready. Refresh your existing Cloudflare link.' -ForegroundColor Green
      exit 0
    }
  } catch { }
}
throw 'App did not become ready. Check .local/cloudflare/app-error.log.'
