import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Clinic extends Document {
  @Prop({ required: true, unique: true })
  maPhongKham: string;

  @Prop({ required: true })
  tenPhongKham: string;

  @Prop({ required: true })
  diaChi: string;

  @Prop({ type: { lat: Number, lng: Number } })
  toaDo?: {
    lat: number;
    lng: number;
  };

  @Prop()
  soDienThoai?: string;

  @Prop()
  email?: string;

  @Prop()
  nguoiDaiDien?: string;

  @Prop()
  chuyenKhoa?: string;

  @Prop({ default: true })
  dangHoatDong: boolean;

  @Prop()
  ghiChu?: string;

  @Prop({ default: false })
  tuDongTaoLenh?: boolean;

  @Prop({
    type: [{
      ngayTaoLenhTrongTuan: [Number],
      noiDungCongViecMacDinh: String,
      ghiChuLenh: String,
      lenhUuTien: Boolean,
    }],
    default: []
  })
  cauHinhTuDongTaoLenh?: Array<{
    ngayTaoLenhTrongTuan: number[];
    noiDungCongViecMacDinh?: string;
    ghiChuLenh?: string;
    lenhUuTien?: boolean;
  }>;

  @Prop()
  nhanVienPhuTrach?: string;

  @Prop()
  sdtLienHe?: string;

  @Prop()
  linkZalo?: string;

  @Prop()
  gioMoCua?: string; // Format: "08:00"

  @Prop()
  gioDongCua?: string; // Format: "17:00"

  @Prop({ type: [Number], default: [1, 2, 3, 4, 5, 6] }) // 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
  ngayLamViec?: number[];
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);
