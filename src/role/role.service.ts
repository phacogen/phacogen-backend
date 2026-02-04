import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './schemas/role.schema';

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {}

  async create(data: any): Promise<Role> {
    const role = new this.roleModel(data);
    return role.save();
  }

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async findOne(id: string): Promise<Role> {
    return this.roleModel.findById(id).exec();
  }

  async update(id: string, data: any): Promise<Role> {
    return this.roleModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<Role> {
    return this.roleModel.findByIdAndDelete(id).exec();
  }
}
