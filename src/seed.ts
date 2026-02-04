import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserService } from './user/user.service';
import { RoleService } from './role/role.service';
import { ClinicService } from './clinic/clinic.service';
import { WorkContentService } from './work-content/work-content.service';
import * as bcrypt from 'bcrypt';

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

    const staffRole = await roleService.create({
      tenVaiTro: 'Nhân viên',
      moTa: 'Nhân viên thu mẫu',
    });

    // Create Users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    await userService.create({
      tenDangNhap: 'admin',
      matKhau: hashedPassword,
      hoTen: 'Quản trị viên',
      email: 'admin@example.com',
      soDienThoai: '0901234567',
      vaiTro: adminRole._id,
      caLamViec: 'FULL_CA',
      viTri: { lat: 10.762622, lng: 106.660172 }, // Ho Chi Minh City
    });

    await userService.create({
      tenDangNhap: 'staff1',
      matKhau: hashedPassword,
      hoTen: 'Nguyễn Văn A',
      email: 'staff1@example.com',
      soDienThoai: '0901234568',
      vaiTro: staffRole._id,
      caLamViec: 'FULL_CA',
      viTri: { lat: 10.773996, lng: 106.700981 },
    });

    await userService.create({
      tenDangNhap: 'staff2',
      matKhau: hashedPassword,
      hoTen: 'Trần Thị B',
      email: 'staff2@example.com',
      soDienThoai: '0901234569',
      vaiTro: staffRole._id,
      caLamViec: 'FULL_CA', // Fix: FULL_CA thay vì CA_1
      viTri: { lat: 10.782345, lng: 106.695432 },
    });

    await userService.create({
      tenDangNhap: 'staff3',
      matKhau: hashedPassword,
      hoTen: 'Lê Văn C',
      email: 'staff3@example.com',
      soDienThoai: '0901234570',
      vaiTro: staffRole._id,
      caLamViec: 'CA_2',
      viTri: { lat: 10.756789, lng: 106.678901 },
    });

    // Create Clinics
    console.log('Creating clinics...');
    await clinicService.create({
      maPhongKham: 'PK001',
      tenPhongKham: 'Phòng khám Đa khoa Quận 1',
      diaChi: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      soDienThoai: '0281234567',
      viTri: { lat: 10.774929, lng: 106.701488 },
    });

    await clinicService.create({
      maPhongKham: 'PK002',
      tenPhongKham: 'Phòng khám Đa khoa Quận 3',
      diaChi: '456 Võ Văn Tần, Quận 3, TP.HCM',
      soDienThoai: '0281234568',
      viTri: { lat: 10.782345, lng: 106.691234 },
    });

    await clinicService.create({
      maPhongKham: 'PK003',
      tenPhongKham: 'Phòng khám Đa khoa Bình Thạnh',
      diaChi: '789 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM',
      soDienThoai: '0281234569',
      viTri: { lat: 10.812345, lng: 106.712345 },
    });

    // Create Work Contents
    console.log('Creating work contents...');
    await workContentService.create({
      tenNoiDung: 'Thu mẫu máu',
      moTa: 'Thu mẫu máu xét nghiệm',
    });

    await workContentService.create({
      tenNoiDung: 'Thu mẫu nước tiểu',
      moTa: 'Thu mẫu nước tiểu xét nghiệm',
    });

    await workContentService.create({
      tenNoiDung: 'Thu mẫu phân',
      moTa: 'Thu mẫu phân xét nghiệm',
    });

    await workContentService.create({
      tenNoiDung: 'Thu mẫu đờm',
      moTa: 'Thu mẫu đờm xét nghiệm',
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
