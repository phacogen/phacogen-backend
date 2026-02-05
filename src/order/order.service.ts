import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  async create(data: any): Promise<Order> {
    const order = new this.orderModel(data);
    return order.save();
  }

  async findAll(filter: any = {}): Promise<Order[]> {
    return this.orderModel.find(filter).exec();
  }

  async findOne(id: string): Promise<Order> {
    return this.orderModel.findById(id).exec();
  }

  async update(id: string, data: any): Promise<Order> {
    return this.orderModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async assignOrder(id: string, nguoiThucHien: string): Promise<Order> {
    return this.orderModel.findByIdAndUpdate(
      id,
      { 
        nguoiThucHien,
        trangThai: OrderStatus.DANG_THUC_HIEN // Chuyển thẳng sang DANG_THUC_HIEN
      },
      { new: true }
    ).exec();
  }

  async updateStatus(id: string, trangThai: string, toaDo?: { lat: number; lng: number }): Promise<Order> {
    const updateData: any = { trangThai };
    
    if (toaDo) {
      updateData.toaDo = toaDo;
    }

    // Nếu hoàn thành, tính toán số liệu
    if (trangThai === OrderStatus.HOAN_THANH) {
      const order = await this.orderModel.findById(id).exec();
      if (order) {
        updateData.soLuongTon = order.soLuongCap - order.soLuongDaDung;
        updateData.tyLeSuDung = order.soLuongCap > 0 
          ? (order.soLuongDaDung / order.soLuongCap) * 100 
          : 0;
      }
    }

    return this.orderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Order> {
    return this.orderModel.findByIdAndDelete(id).exec();
  }

  async getStatsSummary(): Promise<any> {
    const orders = await this.orderModel.find().exec();
    
    const stats = {
      total: orders.length,
      choDieuPhoi: orders.filter(o => o.trangThai === OrderStatus.CHO_DIEU_PHOI).length,
      dangThucHien: orders.filter(o => o.trangThai === OrderStatus.DANG_THUC_HIEN).length,
      hoanThanh: orders.filter(o => o.trangThai === OrderStatus.HOAN_THANH).length,
      daHuy: orders.filter(o => o.trangThai === OrderStatus.DA_HUY).length,
      tongSoLuongCap: orders.reduce((sum, o) => sum + (o.soLuongCap || 0), 0),
      tongSoLuongDaDung: orders.reduce((sum, o) => sum + (o.soLuongDaDung || 0), 0),
      tongSoLuongTon: orders.reduce((sum, o) => sum + (o.soLuongTon || 0), 0),
    };

    return stats;
  }
}
