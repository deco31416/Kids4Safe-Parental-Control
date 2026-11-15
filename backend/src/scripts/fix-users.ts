import { connect, connection } from 'mongoose';
import { getInitialUsers } from './initial-users';
import { assertLocalMutation, loadLocalEnvironment, requireMongoUri } from './script-safety';
import { hashUserPassword } from './user-password';

async function fixUsers() {
  loadLocalEnvironment();
  assertLocalMutation('ALLOW_USER_FIX', 'corrección de usuarios');

  try {
    await connect(requireMongoUri());
    const users = connection.db.collection('users');

    for (const definition of getInitialUsers()) {
      const password = await hashUserPassword(definition.password);
      await users.updateOne(
        { username: definition.username },
        {
          $set: {
            email: definition.email,
            password,
            role: definition.role,
            permissions: definition.permissions,
            isActive: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
      console.log(`✅ Usuario ${definition.username} alineado`);
    }
  } finally {
    await connection.close();
  }
}

fixUsers().catch((error) => {
  console.error('❌ Corrección fallida:', error.message);
  process.exitCode = 1;
});
