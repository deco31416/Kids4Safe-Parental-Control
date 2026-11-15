import { connect, connection } from 'mongoose';
import { getInitialUsers } from './initial-users';
import { assertLocalMutation, loadLocalEnvironment, requireMongoUri } from './script-safety';
import { hashUserPassword, verifyUserPassword } from './user-password';

async function resetUsers() {
  loadLocalEnvironment();
  assertLocalMutation('ALLOW_USER_RESET', 'reset destructivo de usuarios');
  const definitions = getInitialUsers();

  try {
    await connect(requireMongoUri());
    const users = connection.db.collection('users');
    await users.deleteMany({ username: { $in: definitions.map(({ username }) => username) } });

    for (const definition of definitions) {
      const password = await hashUserPassword(definition.password);
      await users.insertOne({
        ...definition,
        password,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const created = await users.findOne({ username: definition.username });
      const valid = created && await verifyUserPassword(definition.password, created.password);
      if (!valid) throw new Error(`No se pudo verificar ${definition.username}`);
      console.log(`✅ Usuario ${definition.username} recreado y verificado`);
    }
  } finally {
    await connection.close();
  }
}

resetUsers().catch((error) => {
  console.error('❌ Reset fallido:', error.message);
  process.exitCode = 1;
});
