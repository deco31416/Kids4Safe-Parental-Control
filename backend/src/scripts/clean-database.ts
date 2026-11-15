import { connect, connection } from 'mongoose';
import * as readline from 'readline';

// ⚠️ PRODUCCIÓN: Requiere MONGODB_URI en variables de entorno
if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI no está definida en variables de entorno');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

// Interfaz para leer input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function cleanDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const db = connection.db;
    const qrsCollection = db.collection('qrcodes');
    const sessionsCollection = db.collection('sessions');

    // Mostrar QRs actuales
    console.log('📊 QRs ACTUALES:');
    console.log('═'.repeat(80));
    const qrs = await qrsCollection.find({}).toArray();
    
    if (qrs.length === 0) {
      console.log('  (No hay QRs en la base de datos)');
    } else {
      for (const qr of qrs) {
        console.log(`  📱 Nombre: ${qr.name}`);
        console.log(`     ID: ${qr.qrId || qr._id}`);
        console.log(`     Estado: ${qr.status || 'N/A'}`);
        console.log(`     Escaneos: ${qr.scanCount || 0}`);
        console.log(`     Creado: ${qr.createdAt ? new Date(qr.createdAt).toLocaleString() : 'N/A'}`);
        console.log('');
      }
    }

    // Mostrar sesiones actuales
    console.log('\n📊 SESIONES ACTUALES:');
    console.log('═'.repeat(80));
    const sessions = await sessionsCollection.find({}).toArray();
    
    if (sessions.length === 0) {
      console.log('  (No hay sesiones en la base de datos)');
    } else {
      for (const session of sessions) {
        console.log(`  🔐 Session ID: ${session.sessionId || session._id}`);
        console.log(`     QR ID: ${session.qrId || 'N/A'}`);
        console.log(`     IP: ${session.ip || 'N/A'}`);
        console.log(`     Device: ${session.device?.type || 'Desconocido'}`);
        console.log(`     Estado: ${session.status || 'N/A'}`);
        console.log(`     Creado: ${session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}`);
        console.log('');
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`📊 RESUMEN: ${qrs.length} QRs | ${sessions.length} Sesiones`);
    console.log('═'.repeat(80) + '\n');

    // Opciones de limpieza
    console.log('🗑️  OPCIONES DE LIMPIEZA:');
    console.log('  1. Eliminar SOLO sesiones');
    console.log('  2. Eliminar SOLO QRs');
    console.log('  3. Eliminar TODO (QRs + Sesiones)');
    console.log('  4. Eliminar por ID específico');
    console.log('  5. Cancelar (no eliminar nada)\n');

    const choice = await question('Selecciona una opción (1-5): ');

    switch (choice.trim()) {
      case '1':
        const confirmSessions = await question(`⚠️  ¿Eliminar TODAS las ${sessions.length} sesiones? (sí/no): `);
        if (confirmSessions.toLowerCase() === 'sí' || confirmSessions.toLowerCase() === 'si') {
          const resultSessions = await sessionsCollection.deleteMany({});
          console.log(`\n✅ ${resultSessions.deletedCount} sesiones eliminadas`);
        } else {
          console.log('\n❌ Operación cancelada');
        }
        break;

      case '2':
        const confirmQRs = await question(`⚠️  ¿Eliminar TODOS los ${qrs.length} QRs? (sí/no): `);
        if (confirmQRs.toLowerCase() === 'sí' || confirmQRs.toLowerCase() === 'si') {
          const resultQRs = await qrsCollection.deleteMany({});
          console.log(`\n✅ ${resultQRs.deletedCount} QRs eliminados`);
        } else {
          console.log('\n❌ Operación cancelada');
        }
        break;

      case '3':
        const confirmAll = await question(`⚠️  ¿Eliminar TODO (${qrs.length} QRs + ${sessions.length} sesiones)? (sí/no): `);
        if (confirmAll.toLowerCase() === 'sí' || confirmAll.toLowerCase() === 'si') {
          const resultSessions = await sessionsCollection.deleteMany({});
          const resultQRs = await qrsCollection.deleteMany({});
          console.log(`\n✅ ${resultQRs.deletedCount} QRs eliminados`);
          console.log(`✅ ${resultSessions.deletedCount} sesiones eliminadas`);
        } else {
          console.log('\n❌ Operación cancelada');
        }
        break;

      case '4':
        const idType = await question('Tipo (qr/session): ');
        const idValue = await question('ID completo o parcial: ');
        
        if (idType.toLowerCase() === 'qr') {
          const result = await qrsCollection.deleteMany({
            $or: [
              { qrId: { $regex: idValue, $options: 'i' } },
              { name: { $regex: idValue, $options: 'i' } }
            ]
          });
          console.log(`\n✅ ${result.deletedCount} QR(s) eliminado(s)`);
        } else if (idType.toLowerCase() === 'session') {
          const result = await sessionsCollection.deleteMany({
            $or: [
              { sessionId: { $regex: idValue, $options: 'i' } },
              { _id: idValue }
            ]
          });
          console.log(`\n✅ ${result.deletedCount} sesión(es) eliminada(s)`);
        } else {
          console.log('\n❌ Tipo inválido');
        }
        break;

      case '5':
        console.log('\n✅ Operación cancelada');
        break;

      default:
        console.log('\n❌ Opción inválida');
        break;
    }

    console.log('\n✨ Script completado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar
cleanDatabase();
