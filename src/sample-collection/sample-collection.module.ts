import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SampleCollectionController } from './sample-collection.controller';
import { SampleCollectionService } from './sample-collection.service';
import { SampleCollection, SampleCollectionSchema } from './schemas/sample-collection.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SampleCollection.name, schema: SampleCollectionSchema }]),
  ],
  controllers: [SampleCollectionController],
  providers: [SampleCollectionService],
  exports: [SampleCollectionService],
})
export class SampleCollectionModule {}
