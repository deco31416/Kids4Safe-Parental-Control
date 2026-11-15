import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { PingController } from './ping.controller';
import { LocationTrackingController } from './location-tracking.controller';
import { DeviceClassificationService } from './device-classification.service';
import { IPGeolocationService } from './ip-geolocation.service';
import { IpInfoService } from './ipinfo.service';
import { IpApiService } from './ip-api.service';
import { IpGeolocationIoService } from './ipgeolocation-io.service';
import { LocationHistoryService } from './location-history.service';
import { LocationTrackingService } from './location-tracking.service';
import { GeoCorrelationService } from './geo-correlation.service';
import { LocationHistory, LocationHistorySchema } from './location-history.schema';
import { Session, SessionSchema } from '../session/session.schema';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    HttpModule,
    FeatureFlagsModule,
    SessionModule,
    MongooseModule.forFeature([
      { name: LocationHistory.name, schema: LocationHistorySchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [
    LocationController,
    PingController,
    LocationTrackingController,
  ],
  providers: [
    LocationService,
    DeviceClassificationService,
    IPGeolocationService,
    IpInfoService,
    IpApiService,
    IpGeolocationIoService,
    LocationHistoryService,
    LocationTrackingService,
    GeoCorrelationService,
  ],
  exports: [
    LocationService,
    DeviceClassificationService,
    IPGeolocationService,
    IpInfoService,
    IpApiService,
    IpGeolocationIoService,
    LocationHistoryService,
    LocationTrackingService,
    GeoCorrelationService,
  ],
})
export class LocationModule {}
