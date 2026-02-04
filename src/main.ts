import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Phacogen Medical Supply API')
    .setDescription('API documentation for Phacogen Medical Supply Management System')
    .setVersion('1.0')
    .addTag('clinics', 'Clinic management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('roles', 'Role management endpoints')
    .addTag('sample-collections', 'Sample collection management endpoints')
    .addTag('work-schedules', 'Work schedule management endpoints')
    .addTag('work-contents', 'Work content management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(5001);
  console.log('🚀 Backend is running on http://localhost:5001');
  console.log('📚 Swagger documentation available at http://localhost:5001/api-docs');
}

bootstrap();
