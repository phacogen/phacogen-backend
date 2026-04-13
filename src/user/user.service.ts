import { BadRequestException, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(data: any): Promise<User> {
    // Auto-generate maNhanVien if not provided
    if (!data.maNhanVien) {
      // Retry logic to handle race conditions
      let retries = 3;
      while (retries > 0) {
        try {
          // Find all existing employee codes and get the max number
          const existingUsers = await this.userModel
            .find({ maNhanVien: /^NV\d+$/ })
            .select('maNhanVien')
            .exec();

          let maxNumber = 0;
          existingUsers.forEach(user => {
            const num = parseInt(user.maNhanVien.replace('NV', ''));
            if (num > maxNumber) {
              maxNumber = num;
            }
          });

          data.maNhanVien = `NV${String(maxNumber + 1).padStart(4, '0')}`;
          
          const user = new this.userModel(data);
          return await user.save();
        } catch (error) {
          // If duplicate key error and we have retries left, try again
          if (error.code === 11000 && retries > 1) {
            retries--;
            continue;
          }
          throw error;
        }
      }
    } else {
      // Check if maNhanVien already exists
      const existingUser = await this.userModel.findOne({ maNhanVien: data.maNhanVien }).exec();
      if (existingUser) {
        throw new ConflictException(`Mã nhân viên ${data.maNhanVien} đã tồn tại`);
      }
    }
    
    const user = new this.userModel(data);
    return user.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().populate('vaiTro').exec();
  }

  async findAllWithPagination(params: {
    role?: string;
    status?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { role, status, search, page = 1, limit = 10 } = params;

    const filter: any = {};

    if (role) {
      filter.vaiTro = role;
    }

    if (status !== undefined) {
      filter.dangHoatDong = status;
    }

    if (search) {
      filter.$or = [
        { hoTen: { $regex: search, $options: 'i' } },
        { maNhanVien: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.userModel.countDocuments(filter).exec();

    const data = await this.userModel
      .find(filter)
      .populate('vaiTro')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<User> {
    return this.userModel.findById(id).populate('vaiTro').exec();
  }

  async update(id: string, data: any): Promise<User> {
    // If password is being updated, use save() to trigger pre-save middleware
    if (data.password) {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new BadRequestException('Người dùng không tồn tại');
      }
      
      // Update all fields
      Object.assign(user, data);
      
      // Save will trigger pre-save middleware to hash password
      await user.save();
      
      // Populate and return
      return this.userModel.findById(id).populate('vaiTro').exec();
    }

    // If no password update, use findByIdAndUpdate as before
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).populate('vaiTro').exec();
  }

  async updateLocation(id: string, location: { lat: number; lng: number }): Promise<User> {
    return this.userModel.findByIdAndUpdate(
      id,
      { viTriHienTai: location },
      { new: true }
    ).exec();
  }

  async findNearestStaff(location: { lat: number; lng: number }): Promise<any[]> {
    // Lọc nhân viên: dangHoatDong = true, có vị trí, và KHÔNG phải OFF hoặc NGHI_LE
    const users = await this.userModel.find({
      dangHoatDong: true,
    }).populate('vaiTro').exec();

    const usersWithDistance = users.map(user => {
      if (user.viTriHienTai) {
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          user.viTriHienTai.lat,
          user.viTriHienTai.lng
        );
        return { ...user.toObject(), distance };
      }
      return { ...user.toObject(), distance: Infinity };
    });

    return usersWithDistance.sort((a, b) => a.distance - b.distance);
  }

  async delete(id: string): Promise<User> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  // Hàm tính khoảng cách Haversine
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
      Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    // Kiểm tra mật khẩu mới và xác nhận có khớp không
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận mật khẩu không khớp');
    }

    // Tìm user
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    // Cập nhật mật khẩu mới (middleware sẽ tự động hash)
    user.password = dto.newPassword;
    await user.save();

    return { message: 'Đổi mật khẩu thành công' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: dto },
      { new: true }
    ).populate('vaiTro').exec();

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    return user;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).populate('vaiTro').exec();
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }
    return user;
  }
}
