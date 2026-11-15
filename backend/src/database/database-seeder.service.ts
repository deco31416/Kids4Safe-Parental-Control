import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { getInitialUsers } from '../scripts/initial-users';
import { assertLocalMutation } from '../scripts/script-safety';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    // Nunca escribir datos iniciales sin autorización explícita, incluso en desarrollo.
    const shouldRunSeed = process.env.RUN_SEEDS === 'true';
    
    if (!shouldRunSeed) {
      console.log('⏭️  Seed omitido. Define RUN_SEEDS=true para ejecutarlo explícitamente.');
      return;
    }

    assertLocalMutation('RUN_SEEDS', 'seed automático de usuarios');
    console.log('🌱 Iniciando seed de base de datos...');
    await this.seedUsers();
  }

  private async seedUsers() {
    const initialUsers = getInitialUsers();

    for (const userData of initialUsers) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await this.userModel.findOne({ 
          username: userData.username 
        });

        if (existingUser) {
          console.log(`✓ Usuario '${userData.username}' ya existe`);
          continue;
        }

        // Hash del password (se hace automáticamente en el pre-save hook del schema)
        
        // Crear usuario
        const user = new this.userModel({
          username: userData.username,
          email: userData.email,
          password: userData.password, // Se hasheará automáticamente en el schema
          role: userData.role,
          permissions: userData.permissions,
          isActive: true,
          createdAt: new Date()
        });

        await user.save();
        console.log(`✅ Usuario '${userData.username}' creado exitosamente (${userData.role})`);
      } catch (error) {
        console.error(`❌ Error creando usuario '${userData.username}':`, error.message);
      }
    }

    console.log('🌱 Seed de usuarios completado');
  }
}
