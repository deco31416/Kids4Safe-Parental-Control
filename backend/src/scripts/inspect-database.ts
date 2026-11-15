import { connect, connection } from 'mongoose';

// ⚠️ PRODUCCIÓN: Requiere MONGODB_URI en variables de entorno
if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI no está definida en variables de entorno');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

async function inspectDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const db = connection.db;
    
    // Listar todas las colecciones
    console.log('📚 COLECCIONES EN LA BASE DE DATOS:');
    console.log('═'.repeat(80));
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const coll = db.collection(collection.name);
      const count = await coll.countDocuments({});
      console.log(`  📂 ${collection.name.padEnd(30)} ${count} documentos`);
      
      // Mostrar documentos si hay pocos
      if (count > 0 && count <= 5) {
        const docs = await coll.find({}).limit(5).toArray();
        for (const doc of docs) {
          console.log(`     └─ ${JSON.stringify(doc).substring(0, 100)}...`);
        }
      }
    }
    
    console.log('═'.repeat(80));
    console.log(`\n📊 Total: ${collections.length} colecciones\n`);

    // Buscar QRs en todas las colecciones posibles
    console.log('🔍 BUSCANDO QRs EN TODAS LAS COLECCIONES:');
    console.log('═'.repeat(80));
    
    const possibleQRCollections = [
      'qrcodes', 'qrs', 'qr', 'qrcode', 
      'qr-codes', 'codes', 'qr_codes'
    ];
    
    for (const collName of possibleQRCollections) {
      try {
        const coll = db.collection(collName);
        const count = await coll.countDocuments({});
        if (count > 0) {
          console.log(`\n✅ Encontrado en "${collName}": ${count} QRs`);
          const docs = await coll.find({}).toArray();
          for (const doc of docs) {
            console.log(`  📱 Nombre: ${doc.name || 'N/A'}`);
            console.log(`     ID: ${doc.qrId || doc._id}`);
            console.log(`     Estado: ${doc.status || 'N/A'}`);
            console.log('');
          }
        }
      } catch (e) {
        // Colección no existe
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar
inspectDatabase();
