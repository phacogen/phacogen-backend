import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: any): Promise<User> {
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
    // Tìm nhân viên gần nhất dựa trên vị trí
    // Sử dụng công thức Haversine để tính khoảng cách
    const users = await this.userModel.find({
      dangHoatDong: true,
      viTriHienTai: { $exists: true }
    }).populate('vaiTro').exec();

    // Tính khoảng cách và sắp xếp
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
}
