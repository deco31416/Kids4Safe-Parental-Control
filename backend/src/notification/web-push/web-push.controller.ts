import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { WebPushService } from './web-push.service';
import { SaveWebPushSubscriptionDto } from './dto/save-web-push-subscription.dto';

@Controller('notifications/web-push')
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('public-key')
  getPublicKey() {
    return this.webPushService.getPublicConfig();
  }

  @Post('subscriptions')
  saveSubscription(
    @Body() dto: SaveWebPushSubscriptionDto,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    return this.webPushService.saveSubscription(dto, publisherToken);
  }

  @Post('receipts')
  recordReceipt(
    @Body() body: {
      sessionId?: string;
      notificationId?: string;
      event?: 'push_received' | 'notification_shown' | 'notification_click' | 'notification_error';
      origin?: string;
      error?: string;
    },
  ) {
    return this.webPushService.recordReceipt(body);
  }
}
