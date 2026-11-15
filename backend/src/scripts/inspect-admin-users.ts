import { connect, connection } from 'mongoose';
import { loadLocalEnvironment, requireMongoUri } from './script-safety';

async function inspectAdminUsers() {
  loadLocalEnvironment();

  try {
    await connect(requireMongoUri());
    const users = await connection.db.collection('users').find(
      {},
      { projection: { _id: 0, username: 1, email: 1, role: 1, isActive: 1 } },
    ).toArray();
    console.table(users);
  } finally {
    await connection.close();
  }
}

inspectAdminUsers().catch((error) => {
  console.error('❌ Inspección fallida:', error.message);
  process.exitCode = 1;
});
