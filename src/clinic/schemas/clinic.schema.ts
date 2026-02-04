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
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);
