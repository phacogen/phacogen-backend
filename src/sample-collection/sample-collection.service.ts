import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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
    const oldData = await this.sampleCollectionModel.findById(id).exec();

    const result = await this.sampleCollectionModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate('phongKham')
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
      .populate('phongKham')
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
      .populate('phongKham')
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

          // Gửi email cho phòng khám nếu có email
          if (result.phongKham && (result.phongKham as any).email) {
            const clinic = result.phongKham as any;
            const employee = result.nhanVienThucHien as any;
            const employeeName = employee?.hoTen || 'Nhân viên';

            const emailResult = await this.emailService.sendCompletionEmail(
              clinic.email,
              clinic.tenPhongKham,
              result.maLenh,
              new Date(),
              employeeName,
            );

            // Lưu kết quả gửi email vào additionalData để trả về cho frontend
            if (!additionalData) additionalData = {};
            additionalData.emailStatus = emailResult;

            console.log(`Email ${emailResult.success ? 'sent successfully' : 'failed'} to ${clinic.email} for order ${result.maLenh}`);
          } else {
            // Không có email phòng khám
            if (!additionalData) additionalData = {};
            additionalData.emailStatus = {
              success: false,
              message: 'Phòng khám chưa cấu hình địa chỉ email',
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

    const stats = {
      total: collections.length,
      choDieuPhoi: collections.filter(c => c.trangThai === SampleCollectionStatus.CHO_DIEU_PHOI).length,
      dangThucHien: collections.filter(c => c.trangThai === SampleCollectionStatus.DANG_THUC_HIEN).length,
      hoanThanh: collections.filter(c => c.trangThai === SampleCollectionStatus.HOAN_THANH).length,
      hoanThanhKiemTra: collections.filter(c => c.trangThai === SampleCollectionStatus.HOAN_THANH_KIEM_TRA).length,
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

  async exportToExcel(): Promise<any> {
    const collections = await this.sampleCollectionModel
      .find()
      .populate('phongKham')
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
      .populate('phongKham')
      .populate('nhanVienThucHien')
      .exec();

    if (!collection) {
      throw new Error('Không tìm thấy lệnh thu mẫu');
    }

    if (collection.trangThai !== SampleCollectionStatus.HOAN_THANH_KIEM_TRA) {
      throw new Error('Lệnh chưa hoàn thành kiểm tra');
    }

    const clinic = collection.phongKham as any;
    if (!clinic || !clinic.email) {
      return {
        success: false,
        message: 'Phòng khám chưa cấu hình địa chỉ email',
      };
    }

    const employee = collection.nhanVienThucHien as any;
    const employeeName = employee?.hoTen || 'Nhân viên';

    return await this.emailService.sendCompletionEmail(
      clinic.email,
      clinic.tenPhongKham,
      collection.maLenh,
      new Date(),
      employeeName,
    );
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

    // Calculate summary stats
    const tongSoLenh = collections.length;
    const tongTienCuocNhanMau = collections.reduce((sum, c) => sum + (c.soTienCuocNhanMau || 0), 0);
    const tongTienShip = collections.reduce((sum, c) => sum + (c.soTienShip || 0), 0);
    const tongTienGuiXe = collections.reduce((sum, c) => sum + (c.soTienGuiXe || 0), 0);

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
}
