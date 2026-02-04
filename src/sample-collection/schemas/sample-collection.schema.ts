import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SampleCollectionStatus {
  CHO_DIEU_PHOI = 'CHO_DIEU_PHOI',
  CHO_NHAN_LENH = 'CHO_NHAN_LENH',
  DANG_THUC_HIEN = 'DANG_THUC_HIEN',
  HOAN_THANH = 'HOAN_THANH',
  DA_HUY = 'DA_HUY',
}

@Schema({ timestamps: true })
export class SampleCollection extends Document {
  @Prop({ required: true, unique: true })
  maLenh: string;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true })
  phongKham: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WorkContent', required: true })
  noiDungCongViec: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  nguoiGiaoLenh: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  nhanVienThucHien?: Types.ObjectId;

  @Prop({ default: 0 })
  soTienCuocNhanMau: number;

  @Prop({ default: 0 })
  soTienShip: number;

  @Prop({ default: 0 })
  soTienGuiXe: number;

  @Prop({ type: [String], default: [] })
  anhHoanThanh?: string[];

  @Prop({ type: [String], default: [] })
  anhHoanThanhKiemTra?: string[];

  @Prop({ required: true, enum: SampleCollectionStatus, default: SampleCollectionStatus.CHO_DIEU_PHOI })
  trangThai: SampleCollectionStatus;

  @Prop()
  thoiGianHoanThanh?: Date;

  @Prop()
  thoiGianHoanThanhKiemTra?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  phongKhamKiemTra?: Types.ObjectId;

  @Prop()
  ghiChu?: string;

  @Prop({ type: { lat: Number, lng: Number } })
  viTri?: {
    lat: number;
    lng: number;
  };

  @Prop({ default: false })
  uuTien?: boolean;

  @Prop()
  thoiGianHenHoanThanh?: Date;
}

export const SampleCollectionSchema = SchemaFactory.createForClass(SampleCollection);
