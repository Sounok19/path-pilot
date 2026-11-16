$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot '.local\mongodb'
$binaryPath = Join-Path $runtimePath 'bin\mongod.exe'
$dataPath = Join-Path $runtimePath 'data'
$logPath = Join-Path $runtimePath 'mongod.log'

function Test-DatabasePort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.BeginConnect('127.0.0.1', 27018, $null, $null)
        if (-not $pending.AsyncWaitHandle.WaitOne(300)) { return $false }
        $client.EndConnect($pending)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

if (Test-DatabasePort) {
    Write-Host 'A database listener is already available at 127.0.0.1:27018.'
    exit 0
}
if (-not (Test-Path -LiteralPath $binaryPath)) {
    throw 'Local MongoDB binary is missing. Use the configured project folder or install MongoDB separately.'
}
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
$launchArguments = '--dbpath "{0}" --logpath "{1}" --logappend --bind_ip 127.0.0.1 --port 27018' -f $dataPath, $logPath
$databaseProcess = Start-Process -FilePath $binaryPath -ArgumentList $launchArguments -WindowStyle Hidden -PassThru
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($databaseProcess.HasExited) { throw "MongoDB stopped during startup. See $logPath" }
    if (Test-DatabasePort) {
        Write-Host 'MongoDB is ready. Student data is saved in .local\mongodb\data.'
        exit 0
    }
    Start-Sleep -Milliseconds 250
}
throw "MongoDB is taking longer than expected. Check $logPath and retry."
