import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type MobileUserDocument = MobileUser & Document;

const getPepper = (): string => process.env.BCRYPT_PEPPER || '';

@Schema({ timestamps: true })
export class MobileUser {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  primaryMobileUnitId?: string;

  @Prop({ type: [String], default: [] })
  linkedMobileUnitIds: string[];

  @Prop()
  termsAcceptedAt?: Date;

  @Prop()
  termsVersion?: string;

  @Prop()
  privacyAcceptedAt?: Date;

  @Prop()
  privacyVersion?: string;

  @Prop()
  onboardingCompletedAt?: Date;

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  async comparePassword(password: string): Promise<boolean> {
    const pepper = getPepper();
    const pepperedPassword = pepper ? password + pepper : password;
    return bcrypt.compare(pepperedPassword, this.password);
  }
}

export const MobileUserSchema = SchemaFactory.createForClass(MobileUser);

MobileUserSchema.index({ primaryMobileUnitId: 1 });
MobileUserSchema.index({ linkedMobileUnitIds: 1 });

MobileUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const pepper = getPepper();
  const pepperedPassword = pepper ? this.password + pepper : this.password;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(pepperedPassword, salt);
});

MobileUserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const pepper = getPepper();
  const pepperedPassword = pepper ? password + pepper : password;
  return bcrypt.compare(pepperedPassword, this.password);
};
