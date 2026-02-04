import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CoordinatesDto {
  @ApiProperty({ example: 10.762622, description: 'Latitude' })
  lat: number;

  @ApiProperty({ example: 106.660172, description: 'Longitude' })
  lng: number;
}

export class CreateSampleCollectionDto {
  @ApiProperty({ example: 'ML001', description: 'Mã lệnh (unique)' })
  maLenh: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'ID phòng khám' })
  phongKham: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012', description: 'ID nội dung công việc' })
  noiDungCongViec: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013', description: 'ID người giao lệnh' })
  nguoiGiaoLenh: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439014', description: 'ID nhân viên thực hiện' })
  nhanVienThucHien?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Số tiền cước nhận mẫu', default: 0 })
  soTienCuocNhanMau?: number;

  @ApiPropertyOptional({ example: 30000, description: 'Số tiền ship', default: 0 })
  soTienShip?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Số tiền gửi xe', default: 0 })
  soTienGuiXe?: number;

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['https://example.com/image1.jpg'], 
    description: 'Ảnh hoàn thành' 
  })
  anhHoanThanh?: string[];

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['https://example.com/image2.jpg'], 
    description: 'Ảnh hoàn thành kiểm tra' 
  })
  anhHoanThanhKiemTra?: string[];

  @ApiPropertyOptional({ 
    example: 'CHO_DIEU_PHOI', 
    description: 'Trạng thái',
    enum: ['CHO_DIEU_PHOI', 'CHO_NHAN_LENH', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_HUY'],
    default: 'CHO_DIEU_PHOI'
  })
  trangThai?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z', description: 'Thời gian hoàn thành' })
  thoiGianHoanThanh?: Date;

  @ApiPropertyOptional({ example: '2024-01-15T11:00:00Z', description: 'Thời gian hoàn thành kiểm tra' })
  thoiGianHoanThanhKiemTra?: Date;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439015', description: 'ID phòng khám kiểm tra' })
  phongKhamKiemTra?: string;

  @ApiPropertyOptional({ example: 'Ghi chú thêm', description: 'Ghi chú' })
  ghiChu?: string;

  @ApiPropertyOptional({ type: CoordinatesDto, description: 'Vị trí' })
  viTri?: CoordinatesDto;

  @ApiPropertyOptional({ example: false, description: 'Ưu tiên', default: false })
  uuTien?: boolean;

  @ApiPropertyOptional({ example: '2024-01-15T15:00:00Z', description: 'Thời gian hẹn hoàn thành' })
  thoiGianHenHoanThanh?: Date;
}
