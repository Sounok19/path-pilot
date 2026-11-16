$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$clientPath = Join-Path $projectRoot '.local/cloudflare/cloudflared.exe'
if (-not (Test-Path -LiteralPath $clientPath)) { throw 'Cloudflare client is missing from .local/cloudflare/cloudflared.exe.' }
if (-not (Test-Path 'client/dist/path-pilot/browser/index.html')) { throw 'Build the client before sharing: npm.cmd run build' }
& "$PSScriptRoot/start-local-database.ps1"
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Database startup failed.' }
$ready = $false
try {
  $health = Invoke-WebRequest 'http://127.0.0.1:3002/api/health' -UseBasicParsing -TimeoutSec 3
  $ready = $health.StatusCode -eq 200
} catch { }
if (-not $ready) {
  $demoProcess = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'scripts/cloud-demo.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/cloudflare/app.log' -RedirectStandardError '.local/cloudflare/app-error.log'
  $demoProcess.Id | Set-Content '.local/cloudflare/app.pid'
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
      $health = Invoke-WebRequest 'http://127.0.0.1:3002/api/health' -UseBasicParsing -TimeoutSec 2
      if ($health.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }
}
if (-not $ready) { throw 'The app did not start. Check .local/cloudflare/app-error.log.' }
Write-Host 'Copy the https://...trycloudflare.com link printed below.' -ForegroundColor Green
Write-Host 'Keep this terminal open and your laptop awake. Press Ctrl+C to stop sharing.'
& $clientPath tunnel --no-autoupdate --url http://127.0.0.1:3002
