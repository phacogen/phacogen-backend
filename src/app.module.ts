import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicModule } from './clinic/clinic.module';
import { OrderModule } from './order/order.module';
import { RoleModule } from './role/role.module';
import { SampleCollectionModule } from './sample-collection/sample-collection.module';
import { UserModule } from './user/user.module';
import { WorkContentModule } from './work-content/work-content.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://uyenptforimex_db_user:Ptuylht090821@cluster0.z6zymcn.mongodb.net/thumauxetnghiem?retryWrites=true&w=majority'),
    UserModule,
    RoleModule,
    ClinicModule,
    WorkContentModule,
    SampleCollectionModule,
    OrderModule,
    WorkScheduleModule,
  ],
})
export class AppModule { }
