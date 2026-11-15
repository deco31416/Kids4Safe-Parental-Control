# 🔐 Sistema de Autenticación Implementado

## ✅ Completado

### Backend (NestJS)
- ✅ MongoDB integrado con Mongoose
- ✅ Esquema de usuarios con contraseñas encriptadas (bcrypt, 12 rounds)
- ✅ JWT authentication configurable por `JWT_EXPIRES_IN` (Railway actual: 7 días)
- ✅ Guards de protección en todas las rutas
- ✅ Permisos granulares por usuario
- ✅ Swagger/OpenAPI con autenticación JWT
- ✅ Rate limiting (100 requests/15min)
- ✅ Helmet para seguridad HTTP
- ✅ Validación de input con class-validator

### Usuarios Iniciales

El seed puede crear usuarios administrativos iniciales, pero esta documentacion no publica usuarios operativos ni contrasenas. Las credenciales deben definirse por variables de entorno, rotarse despues del primer acceso y administrarse desde backend/admin.

### API Protegida
Todos los endpoints ahora requieren JWT token:

**QR Controller:**
- POST /qr/create → requiere `create_qr`
- GET /qr/all → requiere `view_qr`
- GET /qr/:id → requiere `view_qr`
- GET /qr/:id/sessions → requiere `view_qr`
- POST /qr/:id/toggle → requiere `edit_qr`
- DELETE /qr/:id → requiere `delete_qr`

**Session Controller:**
- GET /session/:id → requiere `view_sessions`
- POST /session/create → requiere `manage_sessions`

**Auth Controller:**
- POST /auth/login → público
- POST /auth/register → requiere `manage_users` + JWT
- GET /auth/me → requiere JWT
- POST /auth/change-password → requiere JWT
- GET /auth/users → requiere `manage_users`
- DELETE /auth/users/:id → requiere `manage_users`
- POST /auth/users/:id/toggle → requiere `manage_users`

### Admin Panel
- ✅ Página de login (/login)
- ✅ Autenticación con JWT
- ✅ Almacenamiento de token en sessionStorage
- ✅ Middleware de protección
- ✅ Redirección automática

## 📚 Swagger Disponible

http://localhost:7000/api/docs

### Para autenticarte en Swagger:
1. Usa POST /auth/login con credenciales reales de un usuario autorizado:
   ```json
   {
     "username": "<usuario-admin>",
     "password": "<contrasena-admin-segura>"
   }
   ```
2. Copia el `token` de la respuesta
3. Click en "Authorize" (🔓 candado)
4. Ingresa: `Bearer {tu-token}`
5. Prueba endpoints protegidos

## 🚀 Cómo Usar

### 1. Backend
```bash
cd backend
yarn start:dev
```

Backend corriendo en: http://localhost:7000
Swagger docs: http://localhost:7000/api/docs

### 2. Admin Panel
```bash
cd admin-panel
ppnpm run dev
```

Admin Panel: http://localhost:3002

### 3. Login
- Ir a http://localhost:3002
- Automáticamente redirige a /login
- Usar credenciales reales administradas por backend/admin.
- No mostrar usuarios ni contrasenas de prueba en la pantalla de login.

## 🔒 Características de Seguridad

### 1. Contraseñas
- ✅ Hasheadas con bcrypt (12 salt rounds)
- ✅ Nunca se retornan en respuestas API
- ✅ Validación de longitud mínima (8 caracteres)
- ✅ Pre-save hook automático en Mongoose

### 2. JWT Tokens
- ✅ Secret key configurable (JWT_SECRET en .env)
- ✅ Expiración configurable por `JWT_EXPIRES_IN` (Railway actual: 7 días)
- ✅ Payload incluye: userId, username, role, permissions
- ✅ Verificado en cada request con AuthGuard

### 3. Permisos
- ✅ Sistema de permisos granulares
- ✅ Decorador @Permissions para especificar requisitos
- ✅ PermissionsGuard valida permisos en cada endpoint
- ✅ Superadmin tiene todos los permisos

### 4. Rate Limiting
- ✅ 100 requests por 15 minutos por IP
- ✅ Previene ataques de fuerza bruta

### 5. Helmet
- ✅ Headers de seguridad HTTP
- ✅ Protección contra XSS, clickjacking, etc.

### 6. CORS
- ✅ Configurado para Frontend y Admin Panel
- ✅ Credentials habilitados
- ✅ Métodos permitidos: GET, POST, PUT, PATCH, DELETE

### 7. Validación
- ✅ class-validator en todos los DTOs
- ✅ Whitelist: elimina propiedades no permitidas
- ✅ Transform: convierte tipos automáticamente

## 📝 Variables de Entorno

backend/.env:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/QR-MONITOR

# JWT
JWT_SECRET=<jwt-secret-seguro-32-caracteres-minimo>

# Redis
REDIS_URL=redis://...

# Application
PORT=7000
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3002
```

## 🎯 Próximos Pasos

1. **Admin Panel Dashboard**: Actualizar dashboard con autenticación
2. **Refresh Tokens**: Implementar renovación automática de tokens
3. **MongoDB Atlas**: Migrar a cloud para producción
4. **2FA**: Autenticación de dos factores (opcional)
5. **Audit Log**: Registrar acciones de usuarios
6. **Password Recovery**: Sistema de recuperación de contraseña

## ⚠️ IMPORTANTE para Producción

1. Cambiar JWT_SECRET a un valor seguro
2. Cambiar contraseñas de usuarios iniciales
3. Usar MongoDB Atlas (cloud)
4. Habilitar HTTPS
5. Aumentar rate limits según necesidad
6. Configurar logs y monitoreo
7. Implementar backup de MongoDB

---

**Sistema actualizado para uso con credenciales rotables y sin secretos documentados.**
