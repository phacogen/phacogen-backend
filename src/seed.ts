import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { ClinicService } from './clinic/clinic.service';
import { RoleService } from './role/role.service';
import { UserService } from './user/user.service';
import { WorkContentService } from './work-content/work-content.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userService = app.get(UserService);
  const roleService = app.get(RoleService);
  const clinicService = app.get(ClinicService);
  const workContentService = app.get(WorkContentService);

  try {
    console.log('🌱 Starting seed...');

    // Create Roles
    console.log('Creating roles...');
    const adminRole = await roleService.create({
      tenVaiTro: 'Admin',
      moTa: 'Quản trị viên hệ thống',
    });

    const hashedPassword = await bcrypt.hash('123456', 10);

    await userService.create({
      maNhanVien: 'NV001',
      username: 'admin',
      password: hashedPassword,
      hoTen: 'Quản trị viên',
      email: 'admin@example.com',
      soDienThoai: '0901234567',
      vaiTro: adminRole._id,
      caLamViec: 'FULL_CA',
      viTriHienTai: { lat: 10.762622, lng: 106.660172 }, // Ho Chi Minh City
    });
    console.log('✅ Seed completed successfully!');
    console.log('Default login: admin / 123456');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await app.close();
  }
}

seed();
