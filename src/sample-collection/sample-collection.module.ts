import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusStation, BusStationSchema } from '../bus-station/schemas/bus-station.schema';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { SampleCollectionController } from './sample-collection.controller';
import { SampleCollectionService } from './sample-collection.service';
import { SampleCollectionHistory, SampleCollectionHistorySchema } from './schemas/sample-collection-history.schema';
import { SampleCollectionMessage, SampleCollectionMessageSchema } from './schemas/sample-collection-message.schema';
import { SampleCollection, SampleCollectionSchema } from './schemas/sample-collection.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SampleCollection.name, schema: SampleCollectionSchema },
      { name: SampleCollectionHistory.name, schema: SampleCollectionHistorySchema },
      { name: SampleCollectionMessage.name, schema: SampleCollectionMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: BusStation.name, schema: BusStationSchema },
    ]),
    EmailModule,
    NotificationModule,
  ],
  controllers: [SampleCollectionController],
  providers: [SampleCollectionService],
  exports: [SampleCollectionService],
})
export class SampleCollectionModule {}
