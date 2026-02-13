import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/schemas/notification.schema';
import { User } from '../user/schemas/user.schema';
import { SampleCollectionHistory } from './schemas/sample-collection-history.schema';
import { SampleCollection, SampleCollectionStatus } from './schemas/sample-collection.schema';

@Injectable()
export class SampleCollectionService {
  constructor(
    @InjectModel(SampleCollection.name)
    private sampleCollectionModel: Model<SampleCollection>,
    @InjectModel(SampleCollectionHistory.name)
    private sampleCollectionHistoryModel: Model<SampleCollectionHistory>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) { }

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

    // Xử lý phongKhamItems
    // Nếu có phongKham (lệnh standard), tạo phongKhamItems với 1 item
    let phongKhamItems = data.phongKhamItems || [];
    if (data.phongKham && phongKhamItems.length === 0) {
      phongKhamItems = [{
        phongKham: data.phongKham,
        soTienCuocNhanMau: 0,
        soTienShip: 0,
        soTienGuiXe: 0,
        anhHoanThanhKiemTra: []
      }];
    }

    const sampleCollection = new this.sampleCollectionModel({
      ...data,
      maLenh,
      uuTien,
      phongKhamItems,
    });

    const saved = await sampleCollection.save();

    // Lưu lịch sử: Tạo lệnh (không có trạng thái trước đó)
    await this.saveHistory(
      saved._id.toString(),
      null, // Không có trạng thái trước
      SampleCollectionStatus.CHO_DIEU_PHOI,
      data.nguoiGiaoLenh,
      'Tạo lệnh thu mẫu',
    );

    // Tạo thông báo CHỈ cho Admin khi tạo lệnh mới
    const admins = await this.getAdminUsers();
    for (const admin of admins) {
      await this.notificationService.create({
        userId: admin._id.toString(),
        title: 'Lệnh thu mẫu mới',
        message: `Lệnh thu mẫu ${maLenh} đã được tạo`,
        type: NotificationType.ORDER_ASSIGNED,
        relatedOrderId: saved._id.toString(),
      });
    }

    return saved;
  }

  // Helper method để lấy danh sách Admin
  private async getAdminUsers(): Promise<User[]> {
    const users = await this.userModel.find().populate('vaiTro').exec();
    return users.filter(user => {
      if (user.vaiTro && typeof user.vaiTro === 'object') {
        return (user.vaiTro as any).tenVaiTro === 'Admin';
      }
      return false;
    });
  }

  async findAll(filter: any = {}): Promise<SampleCollection[]> {
    return this.sampleCollectionModel
      .find(filter)
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async findAllWithPagination(params: {
    status?: string;
    search?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SampleCollection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, search, employeeId, page = 1, limit = 10 } = params;

    console.log('=== findAllWithPagination params ===', { status, search, employeeId, page, limit });

    // Build query filter
    const filter: any = {};

    // Filter by status
    if (status) {
      filter.trangThai = status;
    }

    // Filter by employee (creator OR assigned staff)
    if (employeeId) {
      console.log('Adding employee filter for:', employeeId);
      filter.$or = [
        { nguoiGiaoLenh: employeeId },
        { nhanVienThucHien: employeeId }
      ];
    }

    // Search by maLenh or noiDungCongViec
    if (search) {
      const searchConditions: any[] = [
        { maLenh: { $regex: search, $options: 'i' } }, // Case-insensitive search
      ];

      // Nếu search có thể là ObjectId, tìm theo noiDungCongViec
      // Nhưng vì noiDungCongViec là reference, ta cần populate trước
      // Để đơn giản, ta sẽ tìm work content trước
      const workContents = await this.sampleCollectionModel.db.collection('workcontents').find({
        tenCongViec: { $regex: search, $options: 'i' }
      }).toArray();

      if (workContents.length > 0) {
        searchConditions.push({
          noiDungCongViec: { $in: workContents.map(wc => wc._id) }
        });
      }

      // If employeeId filter exists, combine with AND
      if (employeeId) {
        filter.$and = [
          { $or: filter.$or }, // Employee filter
          { $or: searchConditions } // Search filter
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    console.log('Final filter:', JSON.stringify(filter, null, 2));

    // Get total count
    const total = await this.sampleCollectionModel.countDocuments(filter).exec();

    console.log('Total documents found:', total);

    // Get paginated data
    const data = await this.sampleCollectionModel
      .find(filter)
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .sort({ createdAt: -1 }) // Newest first
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

  async findOne(id: string): Promise<SampleCollection> {
    return this.sampleCollectionModel
      .findById(id)
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async findByCode(maLenh: string): Promise<SampleCollection> {
    return this.sampleCollectionModel
      .findOne({ maLenh })
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async update(id: string, data: any): Promise<SampleCollection> {
    const oldData = await this.sampleCollectionModel.findById(id).exec();

    // Ensure uuTien is boolean if provided
    if (data.uuTien !== undefined) {
      data.uuTien = data.uuTien === true || data.uuTien === 'true';
    }

    const result = await this.sampleCollectionModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();

    // Nếu có thay đổi trạng thái, lưu lịch sử
    if (result && data.trangThai && oldData.trangThai !== data.trangThai) {
      let ghiChu = '';
      // Ưu tiên lấy nguoiThucHien từ data (người thực hiện thay đổi)
      // Nếu không có thì lấy nhanVienThucHien (người được giao)
      const nguoiThucHien = data.nguoiThucHien || result.nhanVienThucHien?._id?.toString();

      switch (data.trangThai) {
        case SampleCollectionStatus.CHO_DIEU_PHOI:
          ghiChu = 'Chuyển về chờ điều phối';
          break;
        case SampleCollectionStatus.DANG_THUC_HIEN:
          ghiChu = 'Bắt đầu thực hiện lệnh';
          break;
        case SampleCollectionStatus.HOAN_THANH:
          ghiChu = 'Hoàn thành thu mẫu';
          break;
        case SampleCollectionStatus.HOAN_THANH_KIEM_TRA:
          ghiChu = 'Hoàn thành kiểm tra';
          break;
        case SampleCollectionStatus.DA_HUY:
          ghiChu = 'Hủy lệnh';
          break;
        default:
          ghiChu = 'Cập nhật trạng thái';
      }

      await this.saveHistory(
        id,
        oldData.trangThai, // Trạng thái trước đó
        data.trangThai as SampleCollectionStatus, // Trạng thái mới
        nguoiThucHien,
        ghiChu,
      );

      // Gửi thông báo khi thay đổi trạng thái
      await this.sendStatusChangeNotifications(result, ghiChu);
    }

    // Nếu có giao nhân viên mới (điều phối lệnh)
    if (result && data.nhanVienThucHien && oldData.nhanVienThucHien?.toString() !== data.nhanVienThucHien) {
      // Gửi thông báo cho: người được giao, người tạo lệnh, và Admin
      const recipientIds = new Set<string>();

      // 1. Người được giao
      recipientIds.add(data.nhanVienThucHien);

      // 2. Người tạo lệnh
      if (result.nguoiGiaoLenh) {
        const nguoiGiaoLenhId = typeof result.nguoiGiaoLenh === 'object'
          ? (result.nguoiGiaoLenh as any)._id.toString()
          : (result.nguoiGiaoLenh as any).toString();
        recipientIds.add(nguoiGiaoLenhId);
      }

      // 3. Tất cả Admin
      const admins = await this.getAdminUsers();
      admins.forEach(admin => recipientIds.add(admin._id.toString()));

      // Gửi thông báo cho tất cả người nhận
      for (const userId of recipientIds) {
        await this.notificationService.create({
          userId,
          title: 'Điều phối lệnh thu mẫu',
          message: `Lệnh thu mẫu ${result.maLenh} đã được điều phối`,
          type: NotificationType.ORDER_ASSIGNED,
          relatedOrderId: id,
        });
      }
      console.log(`Notifications sent for order assignment ${result.maLenh} to ${recipientIds.size} users`);
    }

    return result;
  }

  // Helper method để gửi thông báo khi thay đổi trạng thái
  private async sendStatusChangeNotifications(order: SampleCollection, ghiChu: string) {
    const recipientIds = new Set<string>();

    // 1. Người tạo lệnh
    if (order.nguoiGiaoLenh) {
      const nguoiGiaoLenhId = typeof order.nguoiGiaoLenh === 'object'
        ? (order.nguoiGiaoLenh as any)._id.toString()
        : (order.nguoiGiaoLenh as any).toString();
      recipientIds.add(nguoiGiaoLenhId);
    }

    // 2. Người được giao
    if (order.nhanVienThucHien) {
      const nhanVienThucHienId = typeof order.nhanVienThucHien === 'object'
        ? (order.nhanVienThucHien as any)._id.toString()
        : (order.nhanVienThucHien as any).toString();
      recipientIds.add(nhanVienThucHienId);
    }

    // 3. Tất cả Admin
    const admins = await this.getAdminUsers();
    admins.forEach(admin => recipientIds.add(admin._id.toString()));

    // Gửi thông báo cho tất cả người nhận
    for (const userId of recipientIds) {
      await this.notificationService.create({
        userId,
        title: 'Cập nhật trạng thái lệnh',
        message: `Lệnh ${order.maLenh} đã chuyển sang trạng thái: ${ghiChu}`,
        type: NotificationType.ORDER_STATUS_CHANGED,
        relatedOrderId: order._id.toString(),
      });
    }
  }

  async assignStaff(id: string, nhanVienThucHien: string): Promise<SampleCollection> {
    const oldData = await this.sampleCollectionModel.findById(id).exec();

    const result = await this.sampleCollectionModel
      .findByIdAndUpdate(
        id,
        {
          nhanVienThucHien,
          trangThai: SampleCollectionStatus.DANG_THUC_HIEN,
        },
        { new: true }
      )
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();

    // Lưu lịch sử: Điều phối lệnh
    if (result) {
      await this.saveHistory(
        id,
        oldData.trangThai, // Trạng thái trước đó
        SampleCollectionStatus.DANG_THUC_HIEN, // Trạng thái mới
        nhanVienThucHien,
        'Điều phối lệnh cho nhân viên',
      );
    }

    return result;
  }

  async updateStatus(
    id: string,
    trangThai: string,
    additionalData?: any
  ): Promise<SampleCollection> {
    const oldData = await this.sampleCollectionModel.findById(id).exec();
    const updateData: any = { trangThai, ...additionalData };

    // Cập nhật thời gian hoàn thành
    if (trangThai === SampleCollectionStatus.HOAN_THANH) {
      updateData.thoiGianHoanThanh = new Date();
    }

    const result = await this.sampleCollectionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();

    // Lưu lịch sử khi thay đổi trạng thái
    if (result) {
      let ghiChu = '';
      // Ưu tiên lấy nguoiThucHien từ additionalData (người thực hiện thay đổi)
      const nguoiThucHien = additionalData?.nguoiThucHien || result.nhanVienThucHien?._id?.toString();

      switch (trangThai) {
        case SampleCollectionStatus.DANG_THUC_HIEN:
          ghiChu = 'Bắt đầu thực hiện lệnh';
          break;
        case SampleCollectionStatus.HOAN_THANH:
          ghiChu = 'Hoàn thành thu mẫu';
          break;
        case SampleCollectionStatus.HOAN_THANH_KIEM_TRA:
          ghiChu = 'Hoàn thành kiểm tra';

          // Gửi email cho từng phòng khám trong phongKhamItems
          if (result.phongKhamItems && result.phongKhamItems.length > 0) {
            const employee = result.nhanVienThucHien as any;
            const employeeName = employee?.hoTen || 'Nhân viên';

            for (const item of result.phongKhamItems) {
              const clinic = item.phongKham as any;
              if (clinic && clinic.email) {
                const emailResult = await this.emailService.sendCompletionEmail(
                  clinic.email,
                  clinic.tenPhongKham,
                  result.maLenh,
                  new Date(),
                  employeeName,
                );
                console.log(`Email ${emailResult.success ? 'sent successfully' : 'failed'} to ${clinic.email} for order ${result.maLenh}`);
              }
            }

            if (!additionalData) additionalData = {};
            additionalData.emailStatus = {
              success: true,
              message: `Đã gửi email đến ${result.phongKhamItems.length} phòng khám`,
            };
          } else {
            if (!additionalData) additionalData = {};
            additionalData.emailStatus = {
              success: false,
              message: 'Không có phòng khám nào để gửi email',
            };
          }
          break;
        case SampleCollectionStatus.DA_HUY:
          ghiChu = 'Hủy lệnh';
          break;
        default:
          ghiChu = 'Cập nhật trạng thái';
      }

      await this.saveHistory(
        id,
        oldData.trangThai, // Trạng thái trước đó
        trangThai as SampleCollectionStatus, // Trạng thái mới
        nguoiThucHien,
        ghiChu,
        additionalData,
      );

      // Gửi thông báo cho tất cả người liên quan
      await this.sendStatusChangeNotifications(result, ghiChu);
    }

    return result;
  }

  async delete(id: string): Promise<SampleCollection> {
    return this.sampleCollectionModel.findByIdAndDelete(id).exec();
  }

  async getStatsSummary(): Promise<any> {
    const collections = await this.sampleCollectionModel.find().exec();

    // Tính tổng tiền từ phongKhamItems
    let tongSoTienCuocNhanMau = 0;
    let tongSoTienShip = 0;
    let tongSoTienGuiXe = 0;

    collections.forEach(c => {
      if (c.phongKhamItems && c.phongKhamItems.length > 0) {
        c.phongKhamItems.forEach(item => {
          tongSoTienCuocNhanMau += item.soTienCuocNhanMau || 0;
          tongSoTienShip += item.soTienShip || 0;
          tongSoTienGuiXe += item.soTienGuiXe || 0;
        });
      }
    });

    const stats = {
      total: collections.length,
      choDieuPhoi: collections.filter(c => c.trangThai === SampleCollectionStatus.CHO_DIEU_PHOI).length,
      dangThucHien: collections.filter(c => c.trangThai === SampleCollectionStatus.DANG_THUC_HIEN).length,
      hoanThanh: collections.filter(c => c.trangThai === SampleCollectionStatus.HOAN_THANH).length,
      hoanThanhKiemTra: collections.filter(c => c.trangThai === SampleCollectionStatus.HOAN_THANH_KIEM_TRA).length,
      daHuy: collections.filter(c => c.trangThai === SampleCollectionStatus.DA_HUY).length,
      tongSoTienCuocNhanMau,
      tongSoTienShip,
      tongSoTienGuiXe,
    };

    return stats;
  }

  async findByStaff(staffId: string): Promise<SampleCollection[]> {
    return this.sampleCollectionModel
      .find({ nhanVienThucHien: staffId })
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async findByClinic(clinicId: string): Promise<SampleCollection[]> {
    return this.sampleCollectionModel
      .find({ 'phongKhamItems.phongKham': clinicId })
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();
  }

  async exportToExcel(): Promise<any> {
    const collections = await this.sampleCollectionModel
      .find()
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .exec();

    // Return data for Excel export
    // Frontend will handle the actual Excel generation
    return {
      success: true,
      data: collections,
      message: 'Data ready for export',
    };
  }

  // Lấy lịch sử tiến trình của lệnh
  async getHistory(sampleCollectionId: string) {
    return this.sampleCollectionHistoryModel
      .find({ sampleCollectionId })
      .sort({ thoiGian: 1 })
      .populate('nguoiThucHien', 'hoTen maNhanVien')
      .exec();
  }

  // Lưu lịch sử khi có thay đổi trạng thái
  async saveHistory(
    sampleCollectionId: string,
    trangThaiTruoc: SampleCollectionStatus | null,
    trangThai: SampleCollectionStatus,
    nguoiThucHien?: string,
    ghiChu?: string,
    duLieuThayDoi?: any
  ) {
    const history = new this.sampleCollectionHistoryModel({
      sampleCollectionId,
      trangThaiTruoc, // Trạng thái trước đó
      trangThai, // Trạng thái hiện tại
      nguoiThucHien,
      ghiChu,
      thoiGian: new Date(),
      duLieuThayDoi,
    });
    return history.save();
  }

  // Lấy tất cả lịch sử tiến trình (tất cả lệnh)
  async getAllHistory(limit: number = 500) {
    return this.sampleCollectionHistoryModel
      .find()
      .sort({ thoiGian: -1 })
      .limit(limit)
      .populate('sampleCollectionId', 'maLenh')
      .populate('nguoiThucHien', 'hoTen maNhanVien')
      .exec();
  }

  // Gửi lại email thông báo hoàn thành
  async resendCompletionEmail(id: string) {
    const collection = await this.sampleCollectionModel
      .findById(id)
      .populate('phongKhamItems.phongKham')
      .populate('nhanVienThucHien')
      .exec();

    if (!collection) {
      throw new Error('Không tìm thấy lệnh thu mẫu');
    }

    if (collection.trangThai !== SampleCollectionStatus.HOAN_THANH_KIEM_TRA) {
      throw new Error('Lệnh chưa hoàn thành kiểm tra');
    }

    if (!collection.phongKhamItems || collection.phongKhamItems.length === 0) {
      return {
        success: false,
        message: 'Không có phòng khám nào trong lệnh này',
      };
    }

    const employee = collection.nhanVienThucHien as any;
    const employeeName = employee?.hoTen || 'Nhân viên';

    let successCount = 0;
    let failCount = 0;

    for (const item of collection.phongKhamItems) {
      const clinic = item.phongKham as any;
      if (!clinic || !clinic.email) {
        failCount++;
        continue;
      }

      const result = await this.emailService.sendCompletionEmail(
        clinic.email,
        clinic.tenPhongKham,
        collection.maLenh,
        new Date(),
        employeeName,
      );

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return {
      success: successCount > 0,
      message: `Đã gửi email đến ${successCount}/${collection.phongKhamItems.length} phòng khám`,
    };
  }
  async getDashboardStats(filters: {
    status?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    // Build query filter
    const query: any = {};

    if (filters.status) {
      query.trangThai = filters.status;
    }

    if (filters.employeeId) {
      query.nhanVienThucHien = filters.employeeId;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.createdAt.$lte = endDate;
      }
    }

    // Fetch filtered collections
    const collections = await this.sampleCollectionModel
      .find(query)
      .populate('nhanVienThucHien', 'hoTen _id')
      .exec();

    // Calculate summary stats từ phongKhamItems
    const tongSoLenh = collections.length;
    let tongTienCuocNhanMau = 0;
    let tongTienShip = 0;
    let tongTienGuiXe = 0;

    collections.forEach(c => {
      if (c.phongKhamItems && c.phongKhamItems.length > 0) {
        c.phongKhamItems.forEach(item => {
          tongTienCuocNhanMau += item.soTienCuocNhanMau || 0;
          tongTienShip += item.soTienShip || 0;
          tongTienGuiXe += item.soTienGuiXe || 0;
        });
      }
    });

    // Calculate employee stats
    const employeeMap = new Map<string, { name: string; count: number }>();
    collections.forEach((c) => {
      if (c.nhanVienThucHien) {
        const employee = c.nhanVienThucHien as any;
        const id = employee._id.toString();
        const name = employee.hoTen;
        if (employeeMap.has(id)) {
          employeeMap.get(id)!.count++;
        } else {
          employeeMap.set(id, { name, count: 1 });
        }
      }
    });

    const employeeStats = Array.from(employeeMap.values()).map((v) => ({
      tenNhanVien: v.name,
      soLenh: v.count,
    }));

    // Calculate status distribution
    const statusMap = new Map<string, number>();
    collections.forEach((c) => {
      const status = c.trangThai;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusLabels: Record<string, string> = {
      CHO_DIEU_PHOI: 'Chờ điều phối',
      DANG_THUC_HIEN: 'Đang thực hiện',
      HOAN_THANH: 'Hoàn thành',
      HOAN_THANH_KIEM_TRA: 'Hoàn thành kiểm tra',
      DA_HUY: 'Đã hủy',
    };

    const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
      trangThai: statusLabels[status] || status,
      soLuong: count,
      tiLe: tongSoLenh > 0 ? Math.round((count / tongSoLenh) * 100) : 0,
    }));

    return {
      summary: {
        tongSoLenh,
        tongTienCuocNhanMau,
        tongTienShip,
        tongTienGuiXe,
        tongTatCa: tongTienCuocNhanMau + tongTienShip + tongTienGuiXe,
      },
      employeeStats,
      statusDistribution,
    };
  }

  // Tìm các lệnh quá hạn
  async findOverdueOrders(): Promise<SampleCollection[]> {
    const now = new Date();

    // Tìm các lệnh có:
    // - Hạn hoàn thành < hiện tại
    // - Trạng thái khác HOAN_THANH_KIEM_TRA và DA_HUY
    return this.sampleCollectionModel
      .find({
        thoiGianHenHoanThanh: { $lt: now },
        trangThai: {
          $nin: [
            SampleCollectionStatus.HOAN_THANH_KIEM_TRA,
            SampleCollectionStatus.DA_HUY
          ]
        },
      })
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .exec();
  }

  // Gửi thông báo cho các lệnh quá hạn
  async sendOverdueNotifications() {
    const overdueOrders = await this.findOverdueOrders();

    if (overdueOrders.length === 0) {
      return;
    }

    for (const order of overdueOrders) {
      // Kiểm tra xem đã gửi thông báo quá hạn chưa
      const existingNotification = await this.notificationService['notificationModel']
        .findOne({
          relatedOrderId: order._id.toString(),
          type: NotificationType.ORDER_OVERDUE,
        })
        .exec();

      // Nếu đã gửi thông báo quá hạn rồi thì bỏ qua
      if (existingNotification) {
        continue;
      }

      const recipientIds = new Set<string>();

      // 1. Người được giao
      if (order.nhanVienThucHien) {
        const nhanVienId = typeof order.nhanVienThucHien === 'object'
          ? (order.nhanVienThucHien as any)._id.toString()
          : (order.nhanVienThucHien as any).toString();
        recipientIds.add(nhanVienId);
      }

      // 2. Tất cả Admin
      const admins = await this.getAdminUsers();
      admins.forEach(admin => recipientIds.add(admin._id.toString()));

      // Gửi thông báo cho tất cả người nhận
      for (const userId of recipientIds) {
        await this.notificationService.create({
          userId,
          title: 'Lệnh thu mẫu quá hạn',
          message: `Lệnh ${order.maLenh} đã quá hạn hoàn thành`,
          type: NotificationType.ORDER_OVERDUE,
          relatedOrderId: order._id.toString(),
        });
      }
    }
  }

  // Cron job chạy mỗi giờ để kiểm tra lệnh quá hạn
  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueCheck() {
    await this.sendOverdueNotifications();
  }

  // Cron job tự động tạo lệnh mỗi ngày lúc 6:00 sáng
  @Cron('0 6 * * *')
  async handleAutoCreateOrders() {
    try {
      console.log('Running auto-create orders cron job...');
      
      // Lấy admin đầu tiên làm người giao lệnh
      const admins = await this.getAdminUsers();
      if (admins.length === 0) {
        console.error('No admin users found for auto-create orders');
        return;
      }

      const nguoiGiaoLenh = admins[0]._id.toString();
      const result = await this.autoCreateOrders(nguoiGiaoLenh);
      
      console.log(`Auto-create orders completed: ${result.created} created, ${result.skipped} skipped`);
      if (result.errors.length > 0) {
        console.error('Auto-create orders errors:', result.errors);
      }
    } catch (error) {
      console.error('Error in auto-create orders cron job:', error);
    }
  }

  // Tự động tạo lệnh thu mẫu dựa trên cấu hình phòng khám
  async autoCreateOrders(nguoiGiaoLenh: string): Promise<{ created: number; skipped: number; errors: string[] }> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=CN, 1=T2, ..., 6=T7
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const clinics = await this.sampleCollectionModel.db.collection('clinics').find({
      tuDongTaoLenh: true,
      dangHoatDong: true,
    }).toArray();

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const clinic of clinics) {
      try {
        // Kiểm tra xem có cấu hình nào khớp với ngày hôm nay không
        const cauHinhList = clinic.cauHinhTuDongTaoLenh || [];

        for (const cauHinh of cauHinhList) {
          // Kiểm tra ngày trong tuần có khớp không
          if (!cauHinh.ngayTaoLenhTrongTuan || !cauHinh.ngayTaoLenhTrongTuan.includes(dayOfWeek)) {
            continue;
          }

          // Kiểm tra xem hôm nay đã tạo lệnh cho cấu hình này chưa
          const existingOrder = await this.sampleCollectionModel.findOne({
            'phongKhamItems.phongKham': clinic._id,
            noiDungCongViec: cauHinh.noiDungCongViecMacDinh,
            createdAt: {
              $gte: new Date(dateStr + 'T00:00:00.000Z'),
              $lt: new Date(dateStr + 'T23:59:59.999Z'),
            },
          }).exec();

          if (existingOrder) {
            skipped++;
            continue;
          }
          const orderData = {
            noiDungCongViec: cauHinh.noiDungCongViecMacDinh,
            nguoiGiaoLenh,
            ghiChu: cauHinh.ghiChuLenh || '',
            uuTien: cauHinh.lenhUuTien || false,
            nhanVienThucHien: clinic.nhanVienPhuTrach || undefined,
            trangThai: SampleCollectionStatus.DANG_THUC_HIEN,
            thoiGianHenHoanThanh: cauHinh.thoiGianHenHoanThanh
              ? new Date(Date.now() + cauHinh.thoiGianHenHoanThanh * 60 * 60 * 1000)
              : undefined,
            phongKhamItems: [{
              phongKham: clinic._id.toString(),
              soTienCuocNhanMau: 0,
              soTienShip: 0,
              soTienGuiXe: 0,
              anhHoanThanhKiemTra: []
            }]
          };

          await this.create(orderData);
          created++;
        }
      } catch (error) {
        errors.push(`${clinic.tenPhongKham}: ${error.message}`);
      }
    }

    return { created, skipped, errors };
  }

  // Helper method để kiểm tra xem lệnh có phải là bus station order không
  private isBusStationOrder(order: SampleCollection): boolean {
    const workContentId = typeof order.noiDungCongViec === 'object'
      ? (order.noiDungCongViec as any)._id.toString()
      : String(order.noiDungCongViec);
    return workContentId === '698a9efbbb8b349dfb294dd0';
  }

  // Hoàn thành lệnh bus station (chỉ upload ảnh, không cần nhập tiền)
  async completeBusStationOrder(
    id: string,
    anhHoanThanh: string[],
    nguoiThucHien: string
  ): Promise<SampleCollection> {
    const order = await this.findOne(id);
    
    if (!order) {
      throw new Error('Không tìm thấy lệnh thu mẫu');
    }

    if (!this.isBusStationOrder(order)) {
      throw new Error('Lệnh này không phải là lệnh nhận mẫu từ nhà xe');
    }

    // Cập nhật trạng thái sang HOAN_THANH với ảnh
    return this.updateStatus(id, SampleCollectionStatus.HOAN_THANH, {
      anhHoanThanh,
      thoiGianHoanThanh: new Date(),
      nguoiThucHien
    });
  }

  // Hoàn thành kiểm tra với nhiều phòng khám (cho bus station order)
  async completeVerificationWithClinicItems(
    id: string,
    phongKhamItems: Array<{
      phongKham: string;
      soTienCuocNhanMau: number;
      soTienShip: number;
      soTienGuiXe: number;
      anhHoanThanhKiemTra: string[];
    }>,
    nguoiThucHien: string
  ): Promise<SampleCollection> {
    const order = await this.findOne(id);
    
    if (!order) {
      throw new Error('Không tìm thấy lệnh thu mẫu');
    }

    if (!this.isBusStationOrder(order)) {
      throw new Error('Lệnh này không phải là lệnh nhận mẫu từ nhà xe');
    }

    if (order.trangThai !== SampleCollectionStatus.HOAN_THANH) {
      throw new Error('Lệnh phải ở trạng thái HOAN_THANH trước khi hoàn thành kiểm tra');
    }

    if (!phongKhamItems || phongKhamItems.length === 0) {
      throw new Error('Phải có ít nhất một phòng khám');
    }

    // Cập nhật phongKhamItems và chuyển sang HOAN_THANH_KIEM_TRA
    const updated = await this.sampleCollectionModel
      .findByIdAndUpdate(
        id,
        {
          phongKhamItems,
          trangThai: SampleCollectionStatus.HOAN_THANH_KIEM_TRA,
          thoiGianHoanThanhKiemTra: new Date()
        },
        { new: true }
      )
      .populate('phongKhamItems.phongKham')
      .populate('noiDungCongViec')
      .populate('nguoiGiaoLenh')
      .populate('nhanVienThucHien')
      .populate('phongKhamKiemTra')
      .exec();

    // Gửi email cho từng phòng khám
    await this.sendBusStationClinicEmails(updated);

    // Lưu lịch sử
    await this.saveHistory(
      id,
      SampleCollectionStatus.HOAN_THANH,
      SampleCollectionStatus.HOAN_THANH_KIEM_TRA,
      nguoiThucHien,
      'Hoàn thành kiểm tra với nhiều phòng khám'
    );

    // Gửi thông báo
    await this.sendStatusChangeNotifications(updated, 'Hoàn thành kiểm tra');

    return updated;
  }

  // Gửi email cho các phòng khám trong bus station order
  private async sendBusStationClinicEmails(order: SampleCollection): Promise<void> {
    if (!order.phongKhamItems || order.phongKhamItems.length === 0) {
      return;
    }

    const employee = order.nhanVienThucHien as any;
    const employeeName = employee?.hoTen || 'Nhân viên';

    for (const item of order.phongKhamItems) {
      try {
        const clinic = item.phongKham as any;
        if (!clinic || !clinic.email) {
          console.warn(`Clinic ${clinic?._id} has no email configured`);
          continue;
        }

        await this.emailService.sendBusStationCompletionEmail(
          clinic.email,
          clinic.tenPhongKham,
          order.maLenh,
          order.tenNhaXe,
          order.diaChiNhaXe,
          item.soTienCuocNhanMau,
          item.soTienShip,
          item.soTienGuiXe,
          item.anhHoanThanhKiemTra,
          new Date(),
          employeeName
        );
      } catch (error) {
        console.error(`Failed to send email for clinic ${item.phongKham}:`, error);
        // Continue with other clinics even if one fails
      }
    }
  }
}
