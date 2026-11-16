$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$originalLocation = Get-Location
$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$temporaryDrive = $null

# A temporary drive avoids Angular/esbuild traversing protected parent folders
# above this project on Windows. Existing drive mappings are never replaced.
foreach ($letter in @('P','Q','R','S','T','U','V','W','X','Y','Z')) {
    if (-not (Test-Path -LiteralPath ($letter + ':\'))) {
        & subst.exe ($letter + ':') $projectRoot
        if ($LASTEXITCODE -eq 0) { $temporaryDrive = $letter + ':'; break }
    }
}
if (-not $temporaryDrive) { throw 'No unused drive letter is available for the Angular development server.' }

$result = 1
try {
    Set-Location -LiteralPath ($temporaryDrive + '\client')
    & $nodeExecutable --preserve-symlinks --preserve-symlinks-main ($temporaryDrive + '\node_modules\@angular\cli\bin\ng.js') serve --host 127.0.0.1 --port 4300 --proxy-config proxy.conf.json --prebundle=false
    $result = $LASTEXITCODE
} finally {
    Set-Location -LiteralPath $originalLocation.Path
    & subst.exe $temporaryDrive /D
}
exit $result
