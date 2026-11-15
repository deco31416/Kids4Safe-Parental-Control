import Redis from 'ioredis';

// ⚠️ PRODUCCIÓN: Requiere REDIS_URL en variables de entorno
if (!process.env.REDIS_URL) {
  console.error('❌ ERROR: REDIS_URL no está definida en variables de entorno');
  process.exit(1);
}

const REDIS_URL = process.env.REDIS_URL;

async function cleanRedis() {
  const redis = new Redis(REDIS_URL);

  try {
    console.log('🔌 Conectando a Redis...');
    await redis.ping();
    console.log('✅ Conectado a Redis\n');

    // Obtener todos los QRs
    console.log('📊 QRs en Redis:');
    console.log('═'.repeat(80));
    
    const qrIds = await redis.smembers('qr:all');
    console.log(`Total QRs: ${qrIds.length}\n`);

    if (qrIds.length === 0) {
      console.log('  (No hay QRs en Redis)');
    } else {
      for (const qrId of qrIds) {
        const qrData = await redis.get(`qr:${qrId}`);
        if (qrData) {
          const qr = JSON.parse(qrData);
          console.log(`  📱 Nombre: ${qr.name}`);
          console.log(`     ID: ${qr.id}`);
          console.log(`     Escaneos: ${qr.totalScans}`);
          console.log(`     Sesiones activas: ${qr.activeSessions}`);
          console.log(`     Estado: ${qr.isActive ? 'Activo' : 'Inactivo'}`);
          console.log('');
        }
      }
    }

    // Obtener todas las sesiones
    console.log('\n📊 Sesiones en Redis:');
    console.log('═'.repeat(80));
    
    const sessionKeys = await redis.keys('session:*');
    console.log(`Total Sesiones: ${sessionKeys.length}\n`);

    if (sessionKeys.length > 0) {
      for (const key of sessionKeys.slice(0, 10)) { // Mostrar solo las primeras 10
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          console.log(`  🔐 Session ID: ${session.sessionId}`);
          console.log(`     QR ID: ${session.qrId || 'N/A'}`);
          console.log(`     Estado: ${session.status}`);
          console.log('');
        }
      }
      if (sessionKeys.length > 10) {
        console.log(`  ... y ${sessionKeys.length - 10} más\n`);
      }
    }

    console.log('═'.repeat(80));
    console.log(`\n📊 RESUMEN: ${qrIds.length} QRs | ${sessionKeys.length} Sesiones`);
    console.log('═'.repeat(80) + '\n');

    // Limpiar TODO
    console.log('🗑️  Eliminando TODOS los QRs y sesiones de Redis...\n');

    let deletedCount = 0;

    // Eliminar cada QR y sus sesiones asociadas
    for (const qrId of qrIds) {
      await redis.del(`qr:${qrId}`);
      await redis.del(`qr:${qrId}:sessions`);
      deletedCount++;
    }
    
    // Eliminar el set de todos los QRs
    await redis.del('qr:all');
    
    // Eliminar todas las sesiones
    for (const key of sessionKeys) {
      await redis.del(key);
    }

    // Eliminar sets de sesiones
    const sessionSetKeys = await redis.keys('qr:*:sessions');
    for (const key of sessionSetKeys) {
      await redis.del(key);
    }

    console.log(`✅ ${deletedCount} QRs eliminados`);
    console.log(`✅ ${sessionKeys.length} sesiones eliminadas`);
    console.log(`✅ ${sessionSetKeys.length} sets de sesiones eliminados`);

    // Verificar limpieza
    const remainingQRs = await redis.smembers('qr:all');
    const remainingSessions = await redis.keys('session:*');
    
    console.log('\n📊 Estado después de limpiar:');
    console.log(`  QRs: ${remainingQRs.length}`);
    console.log(`  Sesiones: ${remainingSessions.length}`);

    console.log('\n✨ Redis limpio');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await redis.quit();
    console.log('🔌 Desconectado de Redis');
  }
}

// Ejecutar
cleanRedis();
