import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileUnit, MobileUnitSchema } from './mobile-unit.schema';
import { MobileUnitService } from './mobile-unit.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: MobileUnit.name, schema: MobileUnitSchema }])],
  providers: [MobileUnitService],
  exports: [MobileUnitService],
})
export class MobileUnitModule {}
