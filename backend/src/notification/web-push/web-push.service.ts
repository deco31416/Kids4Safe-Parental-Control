import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webPush from 'web-push';
import { SessionService } from '../../session/session.service';
import {
  WebPushSubscription,
  WebPushSubscriptionDocument,
} from './web-push-subscription.schema';
import { SaveWebPushSubscriptionDto } from './dto/save-web-push-subscription.dto';

type WebPushPayload = {
  id: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  imageUrl?: string;
  pdfUrl?: string;
  reactivateTunnel?: boolean;
  reactivateTargets?: string[];
  requestId?: string;
  requestKind?: 'message' | 'service_reactivation';
  requiresConfirmation?: boolean;
  expiresAt?: string;
  sessionId: string;
};

type WebPushReceipt = {
  sessionId?: string;
  notificationId?: string;
  event?: 'push_received' | 'notification_shown' | 'notification_click' | 'notification_error';
  origin?: string;
  error?: string;
};

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    @InjectModel(WebPushSubscription.name)
    private readonly webPushSubscriptionModel: Model<WebPushSubscriptionDocument>,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {
    this.configureWebPush();
  }

  getPublicConfig() {
    const publicKey = this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC_KEY') || '';
    return {
      enabled: this.isConfigured(),
      publicKey,
    };
  }

  async saveSubscription(dto: SaveWebPushSubscriptionDto, publisherToken?: string) {
    const isValid = await this.sessionService.validatePublisherSessionToken(
      dto.sessionId,
      publisherToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Publisher session token invalido');
    }

    const { endpoint, expirationTime, keys } = dto.subscription;
    await this.webPushSubscriptionModel.updateOne(
      { endpoint },
      {
        $set: {
          sessionId: dto.sessionId,
          endpoint,
          expirationTime: expirationTime ?? null,
          keys,
          userAgent: dto.userAgent,
          lastSeenAt: new Date(),
          lastError: null,
          lastErrorAt: null,
        },
      },
      { upsert: true },
    );

    this.logger.log(`Web Push suscripción guardada para sesión ${dto.sessionId}`);
    return { ok: true };
  }

  async sendToSession(sessionId: string, payload: WebPushPayload) {
    if (!this.isConfigured()) {
      return { sent: 0, skipped: true, reason: 'web_push_not_configured' };
    }

    this.configureWebPush();

    const subscriptions = await this.webPushSubscriptionModel
      .find({ sessionId })
      .lean()
      .exec();

    if (subscriptions.length === 0) {
      this.logger.warn(`Web Push sin suscripciones para sesión ${sessionId}`);
      return { sent: 0, skipped: false, reason: 'no_subscriptions' };
    }

    let sent = 0;
    for (const subscription of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: subscription.keys,
          },
          JSON.stringify(payload),
        );

        sent++;
        this.logger.log(`Web Push enviado a sesión ${sessionId}`);
        await this.webPushSubscriptionModel.updateOne(
          { endpoint: subscription.endpoint },
          { $set: { lastSentAt: new Date(), lastError: null, lastErrorAt: null } },
        );
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || error?.status);
        if (statusCode === 404 || statusCode === 410) {
          await this.webPushSubscriptionModel.deleteOne({ endpoint: subscription.endpoint });
          this.logger.warn(`Web Push suscripción expirada eliminada para sesión ${sessionId}`);
          continue;
        }

        await this.webPushSubscriptionModel.updateOne(
          { endpoint: subscription.endpoint },
          {
            $set: {
              lastErrorAt: new Date(),
              lastError: error?.message || 'web_push_send_failed',
            },
          },
        );
        this.logger.warn(`Web Push fallo para ${sessionId}: ${error?.message || error}`);
      }
    }

    return { sent, skipped: false };
  }

  recordReceipt(receipt: WebPushReceipt) {
    const sessionId = receipt.sessionId || 'unknown-session';
    const event = receipt.event || 'unknown-event';
    const notificationId = receipt.notificationId || 'unknown-notification';

    if (event === 'notification_error') {
      this.logger.warn(
        `Web Push receipt ${event} sesión ${sessionId} notification ${notificationId}: ${receipt.error || 'sin detalle'}`,
      );
    } else {
      this.logger.log(`Web Push receipt ${event} sesión ${sessionId} notification ${notificationId}`);
    }

    return { ok: true };
  }

  private configureWebPush() {
    const publicKey = this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('WEB_PUSH_VAPID_PRIVATE_KEY');
    const subject =
      this.configService.get<string>('WEB_PUSH_VAPID_SUBJECT') ||
      'mailto:admin@kids4safe.example';

    if (!publicKey || !privateKey) return;
    webPush.setVapidDetails(subject, publicKey, privateKey);
  }

  private isConfigured() {
    return Boolean(
      this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC_KEY') &&
        this.configService.get<string>('WEB_PUSH_VAPID_PRIVATE_KEY'),
    );
  }
}
