import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, Permission } from './schemas/role.schema';
import { defaultRoles } from './seed-roles';

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

  // Seed dữ liệu vai trò mặc định
  async seedDefaultRoles() {
    const existingRoles = await this.roleModel.countDocuments().exec();
    
    if (existingRoles > 0) {
      return {
        message: 'Roles already exist. Skipping seed.',
        count: existingRoles,
      };
    }

    const roles = await this.roleModel.insertMany(defaultRoles);
    
    return {
      message: 'Default roles seeded successfully',
      count: roles.length,
      roles,
    };
  }

  // Lấy danh sách tất cả permissions
  getAllPermissions() {
    return {
      permissions: Object.values(Permission),
      total: Object.values(Permission).length,
    };
  }
}
