# Pruebas de IP Classifier

## Suite automatizada

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
.\.venv\Scripts\python.exe -m pytest -p no:cacheprovider
Remove-Item Env:PYTHONDONTWRITEBYTECODE
```

La suite cubre autenticacion cerrada por defecto, limites de payload, IP publica,
rechazo de IP privada, encabezado confiable, iPad/tablet, proveedor HTTPS y
proteccion del endpoint de simulacion.

## Integracion local

Con el servicio ya iniciado en otra terminal:

```powershell
.\test-service.ps1
```

El script lee `ADMIN_API_KEY` desde `.env.local` sin imprimirla. Comprueba health,
rechazo sin credencial y el flujo autorizado `/collect`. Usa IP y User-Agent de
prueba; no llama proveedores externos ni escribe datos persistentes.

## Geolocalizacion externa

Esta prueba consume cuota del proveedor y debe ejecutarse solo con autorizacion:

```powershell
$headers = @{ 'x-api-key' = '<clave local>' }
Invoke-RestMethod -Method Post `
  -Uri 'http://127.0.0.1:5009/geolocate?ip_override=8.8.8.8' `
  -Headers $headers
```

No incluir claves reales en comandos compartidos, capturas o tickets.
