import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SampleCollection, SampleCollectionStatus } from './schemas/sample-collection.schema';

@Injectable()
export class SampleCollectionService {
  constructor(
    @InjectModel(SampleCollection.name)
    private sampleCollectionModel: Model<SampleCollection>,
  ) {}

  async create(data: any): Promise<SampleCollection> {
    // Tự động generate mã lệnh theo format: TM-ddmmyy-xxx
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const datePrefix = `TM-${day}${month}${year}`;
    
    // Tìm số thứ tự cao nhất trong ngày
    const lastOrder = await this.sampleCollectionModel
      .findOne({ maLenh: new RegExp(`^${datePrefix}`) })
      .sort({ maLenh: -1 })
      .exec();
    
    let sequence = 1;
    if (lastOrder && lastOrder.maLenh) {
      const lastSequence = parseInt(lastOrder.maLenh.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    const maLenh = `${datePrefix}-${String(sequence).padStart(3, '0')}`;
    
    // Nếu không có nguoiGiaoLenh, báo lỗi rõ ràng
    if (!data.nguoiGiaoLenh) {
      throw new Error('nguoiGiaoLenh is required. Please ensure user is logged in.');
    }
    
    // Ensure uuTien is boolean
    const uuTien = data.uuTien === true || data.uuTien === 'true';
    
    console.log('Creating sample collection with data:', {
      ...data,
      maLenh,
      uuTien,
    });
    
    const sampleCollection = new this.sampleCollectionModel({
      ...data,
      maLenh,
      uuTien,
    });
    
    const saved = await sampleCollection.save();
    console.log('Saved sample collection:', saved);
    
    return saved;
  }

  async findAll(filter: any = {}): Promise<SampleCollection[]> {
    return this.sampleCollectionModel
      .find(filter)
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async findOne(id: string): Promise<SampleCollection> {
    return this.sampleCollectionModel
      .findById(id)
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async findByCode(maLenh: string): Promise<SampleCollection> {
    return this.sampleCollectionModel
      .findOne({ maLenh })
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async update(id: string, data: any): Promise<SampleCollection> {
    return this.sampleCollectionModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async assignStaff(id: string, nhanVienThucHien: string): Promise<SampleCollection> {
    return this.sampleCollectionModel
      .findByIdAndUpdate(
        id,
        {
          nhanVienThucHien,
          trangThai: SampleCollectionStatus.CHO_NHAN_LENH, // Chuyển sang CHO_NHAN_LENH thay vì DANG_THUC_HIEN
        },
        { new: true }
      )
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async updateStatus(
    id: string,
    trangThai: string,
    additionalData?: any
  ): Promise<SampleCollection> {
    const updateData: any = { trangThai, ...additionalData };

    // Cập nhật thời gian hoàn thành
    if (trangThai === SampleCollectionStatus.HOAN_THANH) {
      updateData.thoiGianHoanThanh = new Date();
    }

    return this.sampleCollectionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async delete(id: string): Promise<SampleCollection> {
    return this.sampleCollectionModel.findByIdAndDelete(id).exec();
  }

  async getStatsSummary(): Promise<any> {
    const collections = await this.sampleCollectionModel.find().exec();

    const stats = {
      total: collections.length,
      choDieuPhoi: collections.filter(c => c.trangThai === SampleCollectionStatus.CHO_DIEU_PHOI).length,
      choNhanLenh: collections.filter(c => c.trangThai === SampleCollectionStatus.CHO_NHAN_LENH).length,
      dangThucHien: collections.filter(c => c.trangThai === SampleCollectionStatus.DANG_THUC_HIEN).length,
      hoanThanh: collections.filter(c => c.trangThai === SampleCollectionStatus.HOAN_THANH).length,
      daHuy: collections.filter(c => c.trangThai === SampleCollectionStatus.DA_HUY).length,
      tongSoTienCuocNhanMau: collections.reduce((sum, c) => sum + (c.soTienCuocNhanMau || 0), 0),
      tongSoTienShip: collections.reduce((sum, c) => sum + (c.soTienShip || 0), 0),
      tongSoTienGuiXe: collections.reduce((sum, c) => sum + (c.soTienGuiXe || 0), 0),
    };

    return stats;
  }

  async findByStaff(staffId: string): Promise<SampleCollection[]> {
    return this.sampleCollectionModel
      .find({ nhanVienThucHien: staffId })
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async findByClinic(clinicId: string): Promise<SampleCollection[]> {
    return this.sampleCollectionModel
      .find({ phongKham: clinicId })
      .populate('phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }
}
