import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClinicModule } from './clinic/clinic.module';
import { OrderModule } from './order/order.module';
import { RoleModule } from './role/role.module';
import { SampleCollectionModule } from './sample-collection/sample-collection.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';
import { WorkContentModule } from './work-content/work-content.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
      envFilePath: '.env', // Path to .env file
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://uyenptforimex_db_user:Ptuylht090821@cluster0.z6zymcn.mongodb.net/thumauxetnghiem?retryWrites=true&w=majority'),
    AuthModule,
    UserModule,
    RoleModule,
    ClinicModule,
    SampleCollectionModule,
    OrderModule,
    EmailModule,
    WorkScheduleModule,
    WorkContentModule,
  ],
})
export class AppModule { }
