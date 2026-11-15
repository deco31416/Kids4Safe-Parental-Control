import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export type UserDocument = User & Document;

// Función para obtener PEPPER (lazy load después de que .env esté cargado)
const getPepper = (): string => {
  const pepper = process.env.BCRYPT_PEPPER || '';
  if (!pepper && !getPepper['warned']) {
    console.warn('⚠️ BCRYPT_PEPPER no configurado - se recomienda configurarlo para mayor seguridad');
    getPepper['warned'] = true;
  }
  return pepper;
};

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, default: 'admin' })
  role: string; // admin, superadmin

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop()
  lastLogin: Date;

  @Prop({ type: [String], default: [] })
  permissions: string[]; // create_qr, delete_qr, view_sessions, etc.

  async comparePassword(password: string): Promise<boolean> {
    const pepper = getPepper();
    const pepperedPassword = pepper ? password + pepper : password;
    return bcrypt.compare(pepperedPassword, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const pepper = getPepper();
  const pepperedPassword = pepper ? this.password + pepper : this.password;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(pepperedPassword, salt);
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const pepper = getPepper();
  const pepperedPassword = pepper ? password + pepper : password;
  return bcrypt.compare(pepperedPassword, this.password);
};
