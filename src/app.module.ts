import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { ClinicModule } from './clinic/clinic.module';
import { WorkContentModule } from './work-content/work-content.module';
import { SampleCollectionModule } from './sample-collection/sample-collection.module';
import { OrderModule } from './order/order.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-supply'),
    UserModule,
    RoleModule,
    ClinicModule,
    WorkContentModule,
    SampleCollectionModule,
    OrderModule,
    WorkScheduleModule,
  ],
})
export class AppModule {}
