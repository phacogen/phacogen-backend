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
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);
