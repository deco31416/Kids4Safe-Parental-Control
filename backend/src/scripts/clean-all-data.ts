import { connect, connection } from 'mongoose';

// ⚠️ PRODUCCIÓN: Requiere MONGODB_URI en variables de entorno
if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI no está definida en variables de entorno');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanAll() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const db = connection.db;
    
    // Obtener todas las colecciones
    const qrsCollection = db.collection('qrcodes');
    const sessionsCollection = db.collection('sessions');

    console.log('📊 Estado antes de limpiar:');
    const qrsCount = await qrsCollection.countDocuments({});
    const sessionsCount = await sessionsCollection.countDocuments({});
    console.log(`  QRs: ${qrsCount}`);
    console.log(`  Sesiones: ${sessionsCount}\n`);

    // Eliminar todas las sesiones
    console.log('🗑️  Eliminando sesiones...');
    const sessionResult = await sessionsCollection.deleteMany({});
    console.log(`✅ ${sessionResult.deletedCount} sesiones eliminadas`);

    // Eliminar todos los QRs
    console.log('🗑️  Eliminando QRs...');
    const qrResult = await qrsCollection.deleteMany({});
    console.log(`✅ ${qrResult.deletedCount} QRs eliminados`);

    console.log('\n📊 Estado después de limpiar:');
    const qrsCountAfter = await qrsCollection.countDocuments({});
    const sessionsCountAfter = await sessionsCollection.countDocuments({});
    console.log(`  QRs: ${qrsCountAfter}`);
    console.log(`  Sesiones: ${sessionsCountAfter}`);

    console.log('\n✨ Base de datos limpia');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar
cleanAll();
