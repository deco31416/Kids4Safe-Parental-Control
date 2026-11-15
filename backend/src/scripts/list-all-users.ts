import { connect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI es requerido');

async function listAllUsers() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Conectado\n');

    const db = connection.db;
    const usersCollection = db.collection('users');

    const users = await usersCollection.find({}).toArray();

    console.log('👥 TODOS LOS USUARIOS EN BASE DE DATOS:\n');
    console.log(`📊 Total: ${users.length} usuarios\n`);
    console.log('='.repeat(80));

    // Agrupar por rol
    const usersByRole = {
      superadmin: users.filter((u: any) => u.role === 'superadmin'),
      admin: users.filter((u: any) => u.role === 'admin'),
      viewer: users.filter((u: any) => u.role === 'viewer'),
      other: users.filter((u: any) => !['superadmin', 'admin', 'viewer'].includes(u.role))
    };

    // Mostrar Superadmins
    if (usersByRole.superadmin.length > 0) {
      console.log('\n👑 SUPERADMINS:');
      usersByRole.superadmin.forEach((user: any, index) => {
        console.log(`\n  ${index + 1}. Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID: ${user._id}`);
        console.log(`     Activo: ${user.isActive ? '✅' : '❌'}`);
        console.log(`     Permisos: ${user.permissions?.length || 0}`);
        console.log(`     Creado: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
        console.log(`     Último login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}`);
      });
    } else {
      console.log('\n👑 SUPERADMINS: Ninguno');
    }

    // Mostrar Admins
    if (usersByRole.admin.length > 0) {
      console.log('\n\n⚙️ ADMINS:');
      usersByRole.admin.forEach((user: any, index) => {
        console.log(`\n  ${index + 1}. Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID: ${user._id}`);
        console.log(`     Activo: ${user.isActive ? '✅' : '❌'}`);
        console.log(`     Permisos: ${user.permissions?.length || 0}`);
        console.log(`     Creado: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
        console.log(`     Último login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}`);
      });
    } else {
      console.log('\n\n⚙️ ADMINS: Ninguno');
    }

    // Mostrar Viewers
    if (usersByRole.viewer.length > 0) {
      console.log('\n\n👁️ VIEWERS:');
      usersByRole.viewer.forEach((user: any, index) => {
        console.log(`\n  ${index + 1}. Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID: ${user._id}`);
        console.log(`     Activo: ${user.isActive ? '✅' : '❌'}`);
        console.log(`     Permisos: ${user.permissions?.length || 0}`);
        console.log(`     Creado: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
        console.log(`     Último login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}`);
      });
    } else {
      console.log('\n\n👁️ VIEWERS: Ninguno');
    }

    // Mostrar otros roles
    if (usersByRole.other.length > 0) {
      console.log('\n\n❓ OTROS ROLES:');
      usersByRole.other.forEach((user: any, index) => {
        console.log(`\n  ${index + 1}. Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Rol: ${user.role}`);
        console.log(`     ID: ${user._id}`);
        console.log(`     Activo: ${user.isActive ? '✅' : '❌'}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESUMEN POR ROLES:');
    console.log(`   👑 Superadmins: ${usersByRole.superadmin.length}`);
    console.log(`   ⚙️  Admins: ${usersByRole.admin.length}`);
    console.log(`   👁️  Viewers: ${usersByRole.viewer.length}`);
    console.log(`   ❓ Otros: ${usersByRole.other.length}`);
    console.log(`   📊 TOTAL: ${users.length}`);

    await connection.close();
    console.log('\n✨ Listado completo');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listAllUsers();
