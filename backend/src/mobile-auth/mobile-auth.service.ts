import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { getJwtExpiration } from '../auth/jwt-expiration';
import { MobileUnitService } from '../mobile/mobile-unit.service';
import { MobileProfileService } from '../mobile-profile/mobile-profile.service';
import {
  MobileAcceptLegalDto,
  MobileForgotPasswordDto,
  MobileLoginDto,
  MobileRegisterDto,
  MobileResetPasswordDto,
} from './dto/mobile-auth.dto';
import { MobileUser, MobileUserDocument } from './schemas/mobile-user.schema';

const DEFAULT_LEGAL_VERSION = '2026-06';

@Injectable()
export class MobileAuthService {
  constructor(
    @InjectModel(MobileUser.name)
    private readonly mobileUserModel: Model<MobileUserDocument>,
    private readonly jwtService: JwtService,
    private readonly mobileUnitService: MobileUnitService,
    private readonly mobileProfileService: MobileProfileService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSafeUser(user: MobileUserDocument | MobileUser | any) {
    const raw = typeof user.toObject === 'function' ? user.toObject() : user;
    return {
      id: String(raw._id || raw.id),
      fullName: raw.fullName || '',
      name: raw.fullName || '',
      email: raw.email,
      phone: raw.phone || '',
      isActive: raw.isActive,
      primaryMobileUnitId: raw.primaryMobileUnitId || '',
      linkedMobileUnitIds: raw.linkedMobileUnitIds || [],
      termsAcceptedAt: raw.termsAcceptedAt,
      termsVersion: raw.termsVersion || '',
      privacyAcceptedAt: raw.privacyAcceptedAt,
      privacyVersion: raw.privacyVersion || '',
      onboardingCompletedAt: raw.onboardingCompletedAt,
      lastLogin: raw.lastLogin,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private generateToken(user: MobileUserDocument) {
    return this.jwtService.sign(
      {
        sub: user._id,
        email: user.email,
        type: 'mobile-user',
      },
      { expiresIn: getJwtExpiration(process.env.JWT_EXPIRES_IN) },
    );
  }

  private async linkMobileUnit(user: MobileUserDocument, mobileUnitId?: string, mobileUnitToken?: string) {
    if (!mobileUnitId) return;

    await this.mobileUnitService.assertUnitToken(mobileUnitId, mobileUnitToken);

    const linkedMobileUnitIds = new Set(user.linkedMobileUnitIds || []);
    linkedMobileUnitIds.add(mobileUnitId);
    user.linkedMobileUnitIds = Array.from(linkedMobileUnitIds);
    if (!user.primaryMobileUnitId) user.primaryMobileUnitId = mobileUnitId;
  }

  private async syncMobileProfileFromUser(user: MobileUserDocument, mobileUnitId?: string) {
    await this.mobileProfileService.syncUserProfileToUnit(String(user._id), mobileUnitId);
  }

  async register(payload: MobileRegisterDto, mobileUnitToken?: string) {
    if (!payload.acceptedTerms) {
      throw new BadRequestException('Debes aceptar términos y privacidad para crear la cuenta');
    }

    const email = this.normalizeEmail(payload.email);
    const existingUser = await this.mobileUserModel.findOne({ email }).lean().exec();
    if (existingUser) {
      throw new UnauthorizedException('El correo ya está registrado');
    }

    const user = new this.mobileUserModel({
      fullName: payload.fullName.trim(),
      email,
      phone: payload.phone?.trim() || '',
      password: payload.password,
      termsAcceptedAt: new Date(),
      termsVersion: payload.termsVersion || DEFAULT_LEGAL_VERSION,
      privacyAcceptedAt: new Date(),
      privacyVersion: payload.privacyVersion || DEFAULT_LEGAL_VERSION,
      onboardingCompletedAt: new Date(),
      linkedMobileUnitIds: [],
      isActive: true,
    });

    await this.linkMobileUnit(user, payload.mobileUnitId, mobileUnitToken);
    await user.save();
    await this.syncMobileProfileFromUser(user, payload.mobileUnitId);

    await this.auditService.log({
      eventType: 'MOBILE_USER_REGISTERED',
      actorType: 'user',
      actorId: String(user._id),
      severity: 'info',
      metadata: {
        email,
        mobileUnitId: payload.mobileUnitId,
      },
    });

    return {
      success: true,
      user: this.toSafeUser(user),
      token: this.generateToken(user),
    };
  }

  async login(payload: MobileLoginDto, mobileUnitToken?: string) {
    const email = this.normalizeEmail(payload.email);
    const user = await this.mobileUserModel.findOne({ email }).select('+password').exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await user.comparePassword(payload.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.linkMobileUnit(user, payload.mobileUnitId, mobileUnitToken);
    user.lastLogin = new Date();
    await user.save();
    await this.syncMobileProfileFromUser(user, payload.mobileUnitId);

    await this.auditService.log({
      eventType: 'MOBILE_USER_LOGIN',
      actorType: 'user',
      actorId: String(user._id),
      severity: 'info',
      metadata: {
        email,
        mobileUnitId: payload.mobileUnitId,
      },
    });

    return {
      success: true,
      user: this.toSafeUser(user),
      token: this.generateToken(user),
    };
  }

  async me(userId: string) {
    const user = await this.validateMobileUser(userId);
    return this.toSafeUser(user);
  }

  async validateMobileUser(userId: string) {
    const user = await this.mobileUserModel.findById(userId).exec();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario móvil inválido');
    }
    return user;
  }

  async acceptLegal(userId: string, payload: MobileAcceptLegalDto) {
    if (!payload.acceptedTerms) {
      throw new BadRequestException('acceptedTerms debe ser true');
    }

    const user = await this.validateMobileUser(userId);
    user.termsAcceptedAt = new Date();
    user.termsVersion = payload.termsVersion || DEFAULT_LEGAL_VERSION;
    user.privacyAcceptedAt = new Date();
    user.privacyVersion = payload.privacyVersion || DEFAULT_LEGAL_VERSION;
    await user.save();

    return {
      success: true,
      user: this.toSafeUser(user),
    };
  }

  async forgotPassword(payload: MobileForgotPasswordDto) {
    const email = this.normalizeEmail(payload.email);
    const user = await this.mobileUserModel.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpiresAt').exec();
    const resetToken = randomBytes(32).toString('base64url');

    if (user) {
      user.passwordResetTokenHash = this.hashToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      await this.auditService.log({
        eventType: 'MOBILE_PASSWORD_RESET_REQUESTED',
        actorType: 'user',
        actorId: String(user._id),
        severity: 'warning',
        metadata: { email },
      });
    }

    return {
      success: true,
      message: 'Si el correo existe, se generó una solicitud de recuperación.',
    };
  }

  async resetPassword(payload: MobileResetPasswordDto) {
    const email = this.normalizeEmail(payload.email);
    const tokenHash = this.hashToken(payload.resetToken);
    const user = await this.mobileUserModel
      .findOne({
        email,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetTokenHash +passwordResetExpiresAt')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Token de recuperación inválido o expirado');
    }

    user.password = payload.newPassword;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    await this.auditService.log({
      eventType: 'MOBILE_PASSWORD_RESET_COMPLETED',
      actorType: 'user',
      actorId: String(user._id),
      severity: 'warning',
      metadata: { email },
    });

    return { success: true, message: 'Contraseña actualizada' };
  }
}
