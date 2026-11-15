import { connect, connection } from 'mongoose';
import { getInitialUsers } from './initial-users';
import { assertLocalMutation, loadLocalEnvironment, requireMongoUri } from './script-safety';
import { hashUserPassword } from './user-password';

async function seedUsers() {
  loadLocalEnvironment();
  assertLocalMutation('RUN_SEEDS', 'seed de usuarios');

  try {
    console.log('🔌 Conectando a MongoDB...');
    await connect(requireMongoUri());
    const users = connection.db.collection('users');

    for (const userData of getInitialUsers()) {
      const existing = await users.findOne({ username: userData.username });
      if (existing) {
        console.log(`ℹ️  Usuario ${userData.username} ya existe`);
        continue;
      }

      const password = await hashUserPassword(userData.password);
      const result = await users.insertOne({
        ...userData,
        password,
        isActive: true,
        createdAt: new Date(),
      });
      console.log(`✅ Usuario ${userData.username} creado: ${result.insertedId}`);
    }
  } finally {
    await connection.close();
  }
}

seedUsers().catch((error) => {
  console.error('❌ Seed fallido:', error.message);
  process.exitCode = 1;
});
