$ErrorActionPreference = 'Stop'

$serviceDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$environmentFile = Join-Path $serviceDirectory '.env.local'
if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw '.env.local no existe.'
}

$keyLine = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match '^ADMIN_API_KEY=' } |
    Select-Object -First 1
if (-not $keyLine) {
    throw 'ADMIN_API_KEY no esta configurada.'
}
$apiKey = ($keyLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
if ($apiKey.Length -lt 32) {
    throw 'ADMIN_API_KEY no cumple la longitud minima esperada.'
}

$health = Invoke-RestMethod -Uri 'http://127.0.0.1:5009/health' -TimeoutSec 5
if ($health.status -ne 'healthy') {
    throw 'Health check no saludable.'
}

try {
    Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:5009/collect' `
        -Headers @{ 'User-Agent' = 'Mozilla/5.0' } -Body '{}' `
        -ContentType 'application/json' -TimeoutSec 5 | Out-Null
    throw 'El endpoint acepto una solicitud sin API key.'
}
catch {
    if ([int]$_.Exception.Response.StatusCode -ne 401) {
        throw
    }
}

$response = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:5009/collect' `
    -Headers @{
        'x-api-key' = $apiKey
        'X-Client-IP' = '8.8.8.8'
        'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
    } `
    -Body '{}' -ContentType 'application/json' -TimeoutSec 5

if ($response.ip_public -ne '8.8.8.8' -or $response.device_type -ne 'desktop') {
    throw 'La clasificacion no produjo el resultado esperado.'
}

Write-Output 'IP Classifier integration test: PASS'
