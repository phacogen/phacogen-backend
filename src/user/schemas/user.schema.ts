import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Document, Types } from 'mongoose';

export enum CaLamViec {
  FULL_CA = 'FULL_CA',
  CA_1 = 'CA_1',
  CA_2 = 'CA_2',
  CA_3 = 'CA_3',
  CA_1_CA_2 = 'CA_1_CA_2',
  MOT_PHAN_2_SANG = 'MOT_PHAN_2_SANG',
  MOT_PHAN_2_CHIEU = 'MOT_PHAN_2_CHIEU',
  OFF_SANG = 'OFF_SANG',
  OFF_CHIEU = 'OFF_CHIEU',
  MOT_PHAN = 'MOT_PHAN',
  OFF = 'OFF',
  NGHI_LE = 'NGHI_LE',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  maNhanVien: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  hoTen: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  vaiTro: Types.ObjectId;

  @Prop()
  email: string;

  @Prop()
  soDienThoai: string;

  @Prop({ type: { lat: Number, lng: Number } })
  viTriHienTai?: {
    lat: number;
    lng: number;
  };

  @Prop({ default: true })
  dangHoatDong: boolean;

  @Prop({ enum: CaLamViec, default: CaLamViec.FULL_CA })
  caLamViec: CaLamViec;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this as any;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
