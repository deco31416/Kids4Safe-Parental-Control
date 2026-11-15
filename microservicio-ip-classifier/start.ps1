$ErrorActionPreference = 'Stop'

$serviceDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExecutable = Join-Path $serviceDirectory '.venv\Scripts\python.exe'
$environmentFile = Join-Path $serviceDirectory '.env.local'

if (-not (Test-Path -LiteralPath $pythonExecutable)) {
    throw 'No existe .venv. Instala las dependencias manualmente despues de revisarlas.'
}
if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw 'No existe .env.local. Configuralo sin copiar secretos a archivos versionados.'
}
if (Get-NetTCPConnection -LocalPort 5009 -State Listen -ErrorAction SilentlyContinue) {
    throw 'El puerto 5009 ya esta ocupado.'
}

Push-Location $serviceDirectory
try {
    & $pythonExecutable main.py
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
