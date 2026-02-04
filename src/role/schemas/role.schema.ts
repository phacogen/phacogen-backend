import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, unique: true })
  tenVaiTro: string;

  @Prop()
  moTa: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
