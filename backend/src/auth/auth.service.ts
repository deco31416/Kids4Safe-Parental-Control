import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuditService } from '../audit/audit.service';
import type { SignOptions } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  private toSafeUser(user: UserDocument | User | any) {
    const raw = typeof user.toObject === 'function' ? user.toObject() : user;
    return {
      id: raw._id || raw.id,
      username: raw.username,
      email: raw.email,
      firstName: raw.firstName || '',
      lastName: raw.lastName || '',
      role: raw.role,
      permissions: raw.permissions || [],
      isActive: raw.isActive,
      lastLogin: raw.lastLogin,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async register(registerDto: RegisterDto) {
    // Verificar si el usuario ya existe
    const existingUser = await this.userModel.findOne({
      $or: [
        { username: registerDto.username },
        { email: registerDto.email }
      ]
    });

    if (existingUser) {
      throw new UnauthorizedException('Usuario o email ya existe');
    }

    // Crear nuevo usuario (el password se hashea automáticamente en el schema)
    const user = new this.userModel({
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
      role: registerDto.role || 'admin',
      permissions: registerDto.permissions || [
        'create_qr',
        'view_qr',
        'edit_qr',
        'delete_qr',
        'view_sessions'
      ],
      isActive: true
    });

    await user.save();

    const token = this.generateToken(user);

    return {
      success: true,
      user: this.toSafeUser(user),
      token
    };
  }

  async login(loginDto: LoginDto) {
    console.log('🔍 [Auth Service] Buscando usuario:', loginDto.username);
    
    // Buscar usuario
    const user = await this.userModel.findOne({
      $or: [
        { username: loginDto.username },
        { email: loginDto.username },
      ],
    });

    console.log('👤 [Auth Service] Usuario encontrado:', !!user);
    console.log('✅ [Auth Service] Usuario activo:', user?.isActive);

    if (!user || !user.isActive) {
      console.log('❌ [Auth Service] Usuario no encontrado o inactivo');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    console.log('🔐 [Auth Service] Verificando contraseña...');
    const isPasswordValid = await user.comparePassword(loginDto.password);
    console.log('🔐 [Auth Service] Contraseña válida:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ [Auth Service] Contraseña incorrecta');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    const token = this.generateToken(user);

    return {
      success: true,
      user: this.toSafeUser(user),
      token
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no válido');
    }
    return user;
  }

  async resolveAdminIdentity(payload: any) {
    if (!payload || typeof payload.sub !== 'string' || payload.type) {
      throw new UnauthorizedException('Token administrativo inválido');
    }
    const user = await this.validateUser(payload.sub);
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion || 0)) {
      throw new UnauthorizedException('Credencial administrativa revocada');
    }
    return {
      userId: payload.sub,
      username: user.username,
      role: user.role,
      permissions: user.permissions || [],
    };
  }

  async verifyAdminToken(token: string, permission?: string) {
    const identity = await this.resolveAdminIdentity(this.jwtService.verify(token));
    if (permission && identity.role !== 'superadmin' && !identity.permissions.includes(permission)) {
      throw new UnauthorizedException('Permiso administrativo requerido');
    }
    return identity;
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toSafeUser(user);
  }

  async updateProfile(userId: string, payload: { firstName?: string; lastName?: string; email?: string }) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (payload.email && payload.email !== user.email) {
      const existingEmail = await this.userModel.findOne({
        email: payload.email,
        _id: { $ne: user._id },
      });

      if (existingEmail) {
        throw new UnauthorizedException('El correo ya está en uso');
      }

      user.email = payload.email;
    }

    if (payload.firstName !== undefined) user.firstName = payload.firstName.trim();
    if (payload.lastName !== undefined) user.lastName = payload.lastName.trim();

    await user.save();

    await this.auditService.log({
      eventType: 'ADMIN_PROFILE_UPDATED',
      actorType: 'admin',
      actorId: String(user._id),
      actorUsername: user.username,
      severity: 'info',
      metadata: {
        fields: Object.keys(payload),
      },
    });

    return {
      success: true,
      user: this.toSafeUser(user),
    };
  }

  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      tokenVersion: user.tokenVersion || 0,
    };

    return this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await this.auditService.log({
      eventType: 'ADMIN_PASSWORD_CHANGED',
      actorType: 'admin',
      actorId: String(user._id),
      actorUsername: user.username,
      severity: 'warning',
      metadata: {
        source: 'admin_profile',
      },
    });

    return { success: true, message: 'Contraseña actualizada' };
  }

  async getAllUsers() {
    return this.userModel.find().select('-password').sort({ createdAt: -1 });
  }

  async deleteUser(userId: string) {
    await this.userModel.findByIdAndDelete(userId);
    return { success: true, message: 'Usuario eliminado' };
  }

  async toggleUserStatus(userId: string) {
    const user = await this.userModel.findById(userId);
    user.isActive = !user.isActive;
    if (!user.isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return { success: true, user: { id: user._id, isActive: user.isActive } };
  }
}
