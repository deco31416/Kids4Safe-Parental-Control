import { getInitialUsers } from './scripts/initial-users';
import { assertLocalMutation, loadLocalEnvironment } from './scripts/script-safety';

async function createInitialUsers() {
  loadLocalEnvironment();
  assertLocalMutation('RUN_SEEDS', 'creación inicial de usuarios');

  const [{ NestFactory }, { AppModule }, { AuthService }] = await Promise.all([
    import('@nestjs/core'),
    import('./app.module'),
    import('./auth/auth.service'),
  ]);
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const authService = app.get(AuthService);
    for (const user of getInitialUsers()) {
      try {
        await authService.register(user);
        console.log(`✅ Usuario ${user.username} creado con rol ${user.role}`);
      } catch {
        console.log(`ℹ️  Usuario ${user.username} ya existe`);
      }
    }
  } finally {
    await app.close();
  }
}

createInitialUsers().catch((error) => {
  console.error('❌ Error creando usuarios:', error.message);
  process.exitCode = 1;
});
