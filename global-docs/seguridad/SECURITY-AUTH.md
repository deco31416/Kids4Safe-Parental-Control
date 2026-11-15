# 🔐 Sistema de Autenticación - Kids4Safe

## 📋 Resumen

Sistema completo de autenticación con:
- ✅ MongoDB para almacenar usuarios
- ✅ Contraseñas encriptadas con bcrypt (salt rounds: 12)
- ✅ JWT tokens configurables por `JWT_EXPIRES_IN` (Railway actual: 7 días)
- ✅ Roles y permisos granulares
- ✅ Guards de protección en todas las rutas
- ✅ Swagger protegido con JWT
- ✅ Rate limiting y helmet para seguridad
- ✅ Usuarios administrativos iniciales via seed seguro

---

## 🚀 Setup Inicial

### 1. Instalar dependencias

```bash
cd backend
yarn install --immutable
```

### 2. Configurar MongoDB

**Opción A: MongoDB Local**
```bash
# Instalar MongoDB
# Windows: https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt install mongodb

# Iniciar MongoDB
mongod
```

**Opción B: MongoDB Atlas (Cloud)**
1. Crear cuenta en https://www.mongodb.com/cloud/atlas
2. Crear cluster gratuito
3. Obtener connection string
4. Actualizar `MONGODB_URI` en `.env.local`

### 3. Crear usuarios iniciales

```bash
cd backend
yarn seed:users
```

El seed no debe documentar contrasenas reales. Definir credenciales por variables de entorno, rotarlas despues del primer acceso y nunca exponerlas en README, Swagger, UI publica ni tickets.

### 4. Iniciar el Backend

```bash
yarn start:dev
```

Visita:
- API: http://localhost:7000
- Swagger: http://localhost:7000/api/docs

---

## 🔒 Seguridad Implementada

### 1. Contraseñas
- ✅ Hash con bcrypt (12 salt rounds)
- ✅ Pre-save hook en schema de Mongoose
- ✅ Método `comparePassword()` para validación
- ✅ Nunca se retorna el password en respuestas

### 2. JWT Tokens
- ✅ Firmados con secret key (cambiar en producción)
- ✅ Expiración configurable por `JWT_EXPIRES_IN` (Railway actual: 7 días)
- ✅ Payload incluye: userId, username, role, permissions
- ✅ Verificación en cada request protegido

### 3. Guards
- ✅ `AuthGuard('jwt')`: Verifica token válido
- ✅ `PermissionsGuard`: Verifica permisos específicos
- ✅ Decorador `@Permissions()` para especificar permisos requeridos

### 4. Rate Limiting
- ✅ 100 requests por 15 minutos por IP
- ✅ Protege contra ataques de fuerza bruta

### 5. Helmet
- ✅ Headers de seguridad HTTP
- ✅ Protección contra XSS, clickjacking, etc.

---

## 📡 Endpoints de Autenticación

### POST /auth/login
**Público** - Iniciar sesión

```json
Request:
{
  "username": "<usuario-admin>",
  "password": "<contrasena-admin-segura>"
}

Response:
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@kids4safe.example",
    "role": "admin",
    "permissions": ["create_qr", "view_qr", ...]
  },
  "token": "<TOKEN>"
}
```

### POST /auth/register
**Protegido** - Crear nuevo usuario (requiere `manage_users`)

```json
Headers:
Authorization: Bearer {token}

Request:
{
  "username": "newadmin",
  "email": "newadmin@qrkraken.com",
  "password": "<contrasena-nueva-segura>",
  "role": "admin",
  "permissions": ["create_qr", "view_qr"]
}
```

### GET /auth/me
**Protegido** - Obtener perfil actual

```json
Headers:
Authorization: Bearer {token}

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "username": "admin",
  "email": "admin@kids4safe.example",
  "role": "admin",
  "permissions": ["create_qr", "view_qr", ...]
}
```

### POST /auth/change-password
**Protegido** - Cambiar contraseña

```json
Headers:
Authorization: Bearer {token}

Request:
{
  "currentPassword": "<contrasena-actual>",
  "newPassword": "<contrasena-nueva-segura>"
}
```

### GET /auth/users
**Protegido** - Listar usuarios (requiere `manage_users`)

### DELETE /auth/users/:id
**Protegido** - Eliminar usuario (requiere `manage_users`)

### POST /auth/users/:id/toggle
**Protegido** - Activar/Desactivar usuario (requiere `manage_users`)

---

## 📱 Endpoints de QR (Ahora Protegidos)

### POST /qr/create
**Requiere**: `create_qr` permission

```json
Headers:
Authorization: Bearer {token}

Request:
{
  "name": "Cliente A"
}
```

### GET /qr/all
**Requiere**: `view_qr` permission

### GET /qr/:id
**Requiere**: `view_qr` permission

### POST /qr/:id/toggle
**Requiere**: `edit_qr` permission

### DELETE /qr/:id
**Requiere**: `delete_qr` permission

---

## 🎯 Roles y Permisos

### Superadmin
- Permisos: `*` (todos)
- Puede crear/editar/eliminar usuarios
- Acceso total a todo

### Admin
- Permisos configurables por usuario
- Permisos comunes:
  - `create_qr`: Crear códigos QR
  - `view_qr`: Ver códigos QR
  - `edit_qr`: Editar/Toggle QR
  - `delete_qr`: Eliminar QR
  - `view_sessions`: Ver sesiones
  - `manage_sessions`: Gestionar sesiones
  - `manage_users`: Gestionar otros usuarios

### Viewer (Admin de solo lectura)
- Permisos: `view_qr`, `view_sessions`
- Solo puede ver, no modificar

---

## 🔐 Uso en Admin Panel

### 1. Login
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { token, user } = await response.json();

// Guardar token
sessionStorage.setItem('auth_token', token);
sessionStorage.setItem('user', JSON.stringify(user));
```

### 2. Requests autenticados
```typescript
const token = sessionStorage.getItem('auth_token');

const response = await fetch('/api/qr/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: 'Cliente A' })
});
```

### 3. Verificar permisos en Frontend
```typescript
const user = JSON.parse(sessionStorage.getItem('user'));

if (user.permissions.includes('create_qr')) {
  // Mostrar botón de crear
}

if (user.role === 'superadmin' || user.permissions.includes('delete_qr')) {
  // Mostrar botón de eliminar
}
```

---

## 📚 Swagger/OpenAPI

Accede a http://localhost:7000/api/docs

### Para autenticarte en Swagger:
1. Click en "Authorize" (candado verde)
2. Ingresa: `Bearer {tu-token}`
3. Click "Authorize"
4. Ahora puedes probar endpoints protegidos

### Obtener token para Swagger:
1. Usa POST /auth/login sin autenticar
2. Copia el `token` de la respuesta
3. Agrégalo en Swagger con formato: `Bearer eyJhbG...`

---

## 🔧 Variables de Entorno

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

---

## ✅ Checklist de Seguridad

- [x] Contraseñas hasheadas con bcrypt (12 rounds)
- [x] JWT tokens con expiración
- [x] Todas las rutas admin protegidas
- [x] Guards de permisos granulares
- [x] Rate limiting
- [x] Helmet (headers de seguridad)
- [x] Validación de input (class-validator)
- [x] CORS configurado
- [x] Swagger con autenticación JWT
- [x] MongoDB con usuarios encriptados
- [x] Script de usuarios iniciales

---

## 🚀 Deployment

### Railway/Heroku:
```env
MONGODB_URI=<mongodb-atlas-uri>
JWT_SECRET=<jwt-secret-seguro-32-caracteres-minimo>
```

### Vercel/Netlify:
- Backend en Railway/Heroku
- MongoDB Atlas
- Frontend/Admin consume API con JWT

---

## 📝 Notas de Producción

1. **Genera JWT_SECRET fuerte** antes de producción
2. **Rota credenciales iniciales** despues del primer acceso
3. **Usa MongoDB Atlas** (cloud)
4. **Habilita HTTPS** en producción
5. **Aumenta rate limits** según necesidad
6. **Monitorea logs** de autenticación
7. **Implementa 2FA** (opcional, futuro)
8. **Auditoría de seguridad** regular

---

**Sistema listo para operar solo con secretos fuertes gestionados por entorno.**
