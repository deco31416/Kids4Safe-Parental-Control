import { connect, connection } from 'mongoose';
import { getInitialUsers } from './initial-users';
import { loadLocalEnvironment, requireMongoUri } from './script-safety';
import { verifyUserPassword } from './user-password';

async function verifyPasswords() {
  loadLocalEnvironment();

  try {
    await connect(requireMongoUri());
    const users = connection.db.collection('users');

    for (const definition of getInitialUsers()) {
      const user = await users.findOne({ username: definition.username });
      const valid = user && await verifyUserPassword(definition.password, user.password);
      console.log(`${valid ? '✅' : '❌'} ${definition.username}`);
    }
  } finally {
    await connection.close();
  }
}

verifyPasswords().catch((error) => {
  console.error('❌ Verificación fallida:', error.message);
  process.exitCode = 1;
});
