import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const permissions = [
  'create_qr', 'view_qr', 'edit_qr', 'delete_qr', 'view_sessions',
  'view_audit', 'export_data', 'manage_users', 'system_settings',
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} es requerido`);
  return value;
}

async function passwordUpdate(existingHash, password, pepper) {
  const value = `${password}${pepper}`;
  if (existingHash && await bcrypt.compare(value, existingHash)) return {};
  return { password: await bcrypt.hash(value, 12) };
}

async function ensureAdmin(database, email, password, pepper) {
  const users = database.collection('users');
  const existing = await users.findOne({ $or: [{ email }, { username: email }] });
  const passwordFields = await passwordUpdate(existing?.password, password, pepper);
  const now = new Date();
  await users.updateOne(
    existing ? { _id: existing._id } : { email },
    {
      $set: {
        email, username: email, role: 'superadmin', permissions,
        isActive: true, updatedAt: now, ...passwordFields,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

async function ensureMobileUser(database, email, password, pepper) {
  const users = database.collection('mobileusers');
  const existing = await users.findOne({ email });
  const passwordFields = await passwordUpdate(existing?.password, password, pepper);
  const now = new Date();
  await users.updateOne(
    { email },
    {
      $set: {
        email,
        fullName: process.env.DEMO_USER_FULL_NAME?.trim() || 'Ulises Demo Test',
        isActive: true, updatedAt: now, ...passwordFields,
      },
      $setOnInsert: {
        createdAt: now, linkedMobileUnitIds: [], onboardingCompletedAt: now,
        privacyAcceptedAt: now, privacyVersion: '2026-06',
        termsAcceptedAt: now, termsVersion: '2026-06',
      },
    },
    { upsert: true },
  );
}

async function bootstrap() {
  const confirmed = process.argv.includes('--confirm') || process.env.BOOTSTRAP_DEMO_USERS === 'true';
  if (!confirmed) {
    throw new Error('Usa --confirm o BOOTSTRAP_DEMO_USERS=true para autorizar');
  }
  const uri = required('MONGODB_URI');
  const email = required('ADMIN_EMAIL').toLowerCase();
  const password = required('ADMIN_PASSWORD');
  const pepper = required('BCRYPT_PEPPER');

  await mongoose.connect(uri);
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB no disponible');
  await ensureAdmin(database, email, password, pepper);
  await ensureMobileUser(database, email, password, pepper);
  console.log('Administrador y usuario móvil demo creados o actualizados');
}

bootstrap()
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(message.replace(/:\/\/[^@\s]+@/g, '://***@'));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
