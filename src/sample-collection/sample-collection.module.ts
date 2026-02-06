import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SampleCollectionController } from './sample-collection.controller';
import { SampleCollectionService } from './sample-collection.service';
import { SampleCollection, SampleCollectionSchema } from './schemas/sample-collection.schema';
import { SampleCollectionHistory, SampleCollectionHistorySchema } from './schemas/sample-collection-history.schema';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SampleCollection.name, schema: SampleCollectionSchema },
      { name: SampleCollectionHistory.name, schema: SampleCollectionHistorySchema },
    ]),
    EmailModule,
    NotificationModule,
  ],
  controllers: [SampleCollectionController],
  providers: [SampleCollectionService],
  exports: [SampleCollectionService],
})
export class SampleCollectionModule {}
