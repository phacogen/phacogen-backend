import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CoordinatesDto {
  @ApiProperty({ example: 10.762622, description: 'Latitude' })
  lat: number;

  @ApiProperty({ example: 106.660172, description: 'Longitude' })
  lng: number;
}

export class CreateClinicDto {
  @ApiProperty({ example: 'PK001', description: 'Mã phòng khám (unique)' })
  maPhongKham: string;

  @ApiProperty({ example: 'Phòng khám Đa khoa ABC', description: 'Tên phòng khám' })
  tenPhongKham: string;

  @ApiProperty({ example: '123 Nguyễn Văn Linh, Q7, TP.HCM', description: 'Địa chỉ phòng khám' })
  diaChi: string;

  @ApiPropertyOptional({ type: CoordinatesDto, description: 'Tọa độ phòng khám' })
  toaDo?: CoordinatesDto;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại' })
  soDienThoai?: string;

  @ApiPropertyOptional({ example: 'contact@clinic.com', description: 'Email' })
  email?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Người đại diện' })
  nguoiDaiDien?: string;

  @ApiPropertyOptional({ example: 'Nội khoa', description: 'Chuyên khoa' })
  chuyenKhoa?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động', default: true })
  dangHoatDong?: boolean;

  @ApiPropertyOptional({ example: 'Ghi chú thêm', description: 'Ghi chú' })
  ghiChu?: string;
}
