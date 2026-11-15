# Script de Validación de Variables de Entorno
# Verifica que todas las variables requeridas estén configuradas

Write-Host "🔍 Validando configuración de variables de entorno..." -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()
$environmentFile = ".env.local"

# Función para verificar variable
function Test-EnvVar {
    param([string]$Name, [bool]$Required = $true, [string]$Description = "")
    
    $value = [System.Environment]::GetEnvironmentVariable($Name)
    $inEnvFile = Select-String -Path $environmentFile -Pattern "^$Name=" -ErrorAction SilentlyContinue
    
    if ($inEnvFile) {
        $envLine = $inEnvFile.Line
        if ($envLine -match "^$Name=\s*$") {
            if ($Required) {
                Write-Host "❌ $Name - VACÍO (requerido)" -ForegroundColor Red
                Write-Host "   📝 $Description" -ForegroundColor Gray
                $script:errors += $Name
            } else {
                Write-Host "⚠️  $Name - VACÍO (opcional)" -ForegroundColor Yellow
                Write-Host "   📝 $Description" -ForegroundColor Gray
                $script:warnings += $Name
            }
        } else {
            Write-Host "✅ $Name - Configurado" -ForegroundColor Green
        }
    } else {
        if ($Required) {
            Write-Host "❌ $Name - NO ENCONTRADO (requerido)" -ForegroundColor Red
            Write-Host "   📝 $Description" -ForegroundColor Gray
            $script:errors += $Name
        } else {
            Write-Host "ℹ️  $Name - No configurado (opcional)" -ForegroundColor Cyan
        }
    }
}

# Verificar que existe el archivo .env.local
if (-not (Test-Path $environmentFile)) {
    Write-Host "❌ ERROR CRÍTICO: Archivo .env.local no encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Pasos para configurar:" -ForegroundColor Yellow
    Write-Host "   1. Copia .env.example a .env.local" -ForegroundColor White
    Write-Host "   2. Edita .env.local y configura las variables" -ForegroundColor White
    Write-Host "   3. Genera JWT_SECRET: openssl rand -hex 32" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "📋 Verificando variables requeridas..." -ForegroundColor Yellow
Write-Host ""

# Variables críticas de seguridad
Write-Host "🔐 Seguridad:" -ForegroundColor Cyan
Test-EnvVar "JWT_SECRET" $true "Secret para firmar tokens JWT (32+ caracteres)"
Test-EnvVar "ADMIN_API_KEY" $true "API Key compartida con panel y microservicios"
Test-EnvVar "ADMIN_EMAIL" $true "Email del administrador local"
Test-EnvVar "ADMIN_PASSWORD" $true "Contraseña del administrador local"
Test-EnvVar "SEED_ADMIN_PASSWORD" $false "Contraseña local independiente para el rol admin"
Test-EnvVar "SEED_VIEWER_PASSWORD" $false "Contraseña local independiente para el rol viewer"
Write-Host ""

# Base de datos
Write-Host "🗄️  Base de Datos:" -ForegroundColor Cyan
Test-EnvVar "MONGODB_URI" $true "URI de conexión a MongoDB"
Test-EnvVar "REDIS_URL" $true "URI completa de conexión a Redis"
Write-Host ""

# URLs
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Test-EnvVar "FRONTEND_URL" $false "URL del Frontend"
Test-EnvVar "ADMIN_URL" $false "URL del Admin Panel"
Write-Host ""

# Microservicios
Write-Host "📡 Microservicios:" -ForegroundColor Cyan
Test-EnvVar "DEVICE_INFO_URL" $false "URL del microservicio Device Info"
Test-EnvVar "LOCATION_URL" $false "URL del microservicio Location"
Test-EnvVar "SCREEN_RECORDER_URL" $false "URL del microservicio Screen Recorder"
Test-EnvVar "SESSION_ORCHESTRATOR_URL" $false "URL del microservicio Session Orchestrator"
Test-EnvVar "AUDIT_LOG_URL" $false "URL del microservicio Audit Log"
Test-EnvVar "POLICY_ENGINE_URL" $false "URL del microservicio Policy Engine"
Test-EnvVar "LOCATION_TRACK_URL" $false "URL del microservicio Location Track"
Test-EnvVar "IP_CLASSIFIER_URL" $false "URL del microservicio IP Classifier"
Write-Host ""

# Resumen
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
if ($errors.Count -eq 0) {
    Write-Host "✅ VALIDACIÓN EXITOSA" -ForegroundColor Green
    Write-Host ""
    Write-Host "Todas las variables requeridas están configuradas." -ForegroundColor White
    
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  $($warnings.Count) variables opcionales vacías:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
    }
    
    Write-Host ""
    Write-Host "💡 Recuerda:" -ForegroundColor Cyan
    Write-Host "   - No commitear el archivo .env.local al repositorio" -ForegroundColor White
    Write-Host "   - Usar contraseñas fuertes en producción" -ForegroundColor White
    Write-Host "   - Rotar secretos periódicamente" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ VALIDACIÓN FALLIDA" -ForegroundColor Red
    Write-Host ""
    Write-Host "$($errors.Count) variables requeridas faltantes:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
    Write-Host ""
    Write-Host "📝 Configura estas variables en .env.local antes de iniciar la aplicación" -ForegroundColor Yellow
    Write-Host ""
    
    # Generar JWT_SECRET si falta
    if ($errors -contains "JWT_SECRET") {
        Write-Host "💡 Para generar JWT_SECRET:" -ForegroundColor Cyan
        Write-Host "   openssl rand -hex 32" -ForegroundColor White
        Write-Host ""
        Write-Host "   O en PowerShell:" -ForegroundColor White
        Write-Host "   -join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})" -ForegroundColor White
        Write-Host ""
    }
    
    exit 1
}
