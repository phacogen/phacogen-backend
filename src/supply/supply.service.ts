import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supply, SupplyDocument, SupplyStatus } from './schemas/supply.schema';
import { SupplyAllocation, SupplyAllocationDocument, AllocationStatus } from './schemas/supply-allocation.schema';
import { SupplyHistory, SupplyHistoryDocument, HistoryType } from './schemas/supply-history.schema';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { PrepareAllocationDto } from './dto/prepare-allocation.dto';

@Injectable()
export class SupplyService {
  constructor(
    @InjectModel(Supply.name)
    private supplyModel: Model<SupplyDocument>,
    @InjectModel(SupplyAllocation.name)
    private allocationModel: Model<SupplyAllocationDocument>,
    @InjectModel(SupplyHistory.name)
    private historyModel: Model<SupplyHistoryDocument>,
  ) {}

  // ============ QUẢN LÝ VẬT TƯ ============

  async createSupply(createSupplyDto: CreateSupplyDto): Promise<SupplyDocument> {
    const supply = new this.supplyModel(createSupplyDto);
    return supply.save();
  }

  async findAllSupplies(): Promise<SupplyDocument[]> {
    return this.supplyModel.find().sort({ maVatTu: 1 }).exec();
  }

  async findAllSuppliesWithPagination(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SupplyDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, search, page = 1, limit = 10 } = params || {};

    const filter: any = {};

    if (status) {
      filter.trangThai = status;
    }

    if (search) {
      filter.$or = [
        { maVatTu: { $regex: search, $options: 'i' } },
        { tenVatTu: { $regex: search, $options: 'i' } },
        { moTa: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.supplyModel.countDocuments(filter).exec();

    const data = await this.supplyModel
      .find(filter)
      .sort({ maVatTu: 1 })
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

  async findSupplyById(id: string): Promise<SupplyDocument> {
    const supply = await this.supplyModel.findById(id).exec();
    if (!supply) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }
    return supply;
  }

  async updateSupply(id: string, updateSupplyDto: UpdateSupplyDto): Promise<SupplyDocument> {
    const supply = await this.supplyModel
      .findByIdAndUpdate(id, updateSupplyDto, { new: true })
      .exec();
    
    if (!supply) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }

    // Cập nhật trạng thái dựa trên tồn kho
    await this.updateSupplyStatus(id);
    
    return supply;
  }

  async deleteSupply(id: string): Promise<void> {
    const result = await this.supplyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }
  }

  // Điều chỉnh tồn kho
  async adjustStock(id: string, adjustStockDto: AdjustStockDto): Promise<SupplyDocument> {
    const supply = await this.findSupplyById(id);
    
    const newStock = supply.tonKho + adjustStockDto.soLuong;
    if (newStock < 0) {
      throw new BadRequestException('Số lượng tồn kho không thể âm');
    }

    supply.tonKho = newStock;
    await supply.save();

    // Lưu lịch sử
    await this.saveHistory({
      vatTu: supply._id,
      loaiThayDoi: HistoryType.DIEU_CHINH,
      soLuong: adjustStockDto.soLuong,
      lyDo: adjustStockDto.lyDo || 'Điều chỉnh kho',
      nguoiThucHien: adjustStockDto.nguoiThucHien,
      thoiGian: new Date(),
    });

    // Cập nhật trạng thái
    await this.updateSupplyStatus(id);

    return supply;
  }

  // Cập nhật trạng thái vật tư dựa trên tồn kho
  private async updateSupplyStatus(id: string): Promise<void> {
    const supply = await this.findSupplyById(id);
    
    const newStatus = supply.tonKho < supply.mucToiThieu 
      ? SupplyStatus.CAN_NHAP_THEM 
      : SupplyStatus.BINH_THUONG;

    if (supply.trangThai !== newStatus) {
      supply.trangThai = newStatus;
      await supply.save();
    }
  }

  // ============ QUẢN LÝ PHIẾU CẤP PHÁT ============

  async createAllocation(createAllocationDto: CreateAllocationDto): Promise<SupplyAllocationDocument> {
    // Generate mã phiếu: PC + ddMMyyHHmmss
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    const maPhieu = `PC${day}${month}${year}${hour}${minute}${second}`;

    // Kiểm tra tồn kho đủ không
    for (const item of createAllocationDto.danhSachVatTu) {
      const supply = await this.findSupplyById(item.vatTu);
      if (supply.tonKho < item.soLuong) {
        throw new BadRequestException(
          `Vật tư "${supply.tenVatTu}" không đủ số lượng. Tồn kho: ${supply.tonKho}, Yêu cầu: ${item.soLuong}`
        );
      }
    }

    const allocation = new this.allocationModel({
      ...createAllocationDto,
      maPhieu,
      trangThai: AllocationStatus.CHO_CHUAN_BI,
    });

    return allocation.save();
  }

  async findAllAllocations(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SupplyAllocationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, search, page = 1, limit = 10 } = params || {};
    
    const filter: any = {};
    
    if (status) {
      filter.trangThai = status;
    }
    
    // Search by maPhieu or clinic name
    if (search) {
      // First, find clinics matching the search term
      const clinics = await this.allocationModel.db.collection('clinics').find({
        tenPhongKham: { $regex: search, $options: 'i' }
      }).toArray();
      
      const clinicIds = clinics.map(c => c._id);
      
      // Search by maPhieu OR clinic name
      filter.$or = [
        { maPhieu: { $regex: search, $options: 'i' } },
        { phongKham: { $in: clinicIds } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const total = await this.allocationModel.countDocuments(filter).exec();
    
    const data = await this.allocationModel
      .find(filter)
      .populate('nguoiTaoPhieu', 'hoTen')
      .populate('phongKham', 'tenPhongKham')
      .populate('nguoiGiaoHang', 'hoTen')
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

  async findAllocationById(id: string): Promise<SupplyAllocationDocument> {
    const allocation = await this.allocationModel
      .findById(id)
      .populate('nguoiTaoPhieu', 'hoTen')
      .populate('phongKham')
      .populate('nguoiGiaoHang', 'hoTen')
      .exec();
    
    if (!allocation) {
      throw new NotFoundException('Không tìm thấy phiếu cấp phát');
    }
    
    return allocation;
  }

  // Chuẩn bị hàng - Cập nhật hạn sử dụng và trừ tồn kho
  async prepareAllocation(id: string, prepareAllocationDto: PrepareAllocationDto): Promise<SupplyAllocationDocument> {
    const allocation = await this.findAllocationById(id);
    
    if (allocation.trangThai !== AllocationStatus.CHO_CHUAN_BI) {
      throw new BadRequestException('Phiếu không ở trạng thái chờ chuẩn bị');
    }

    // Cập nhật hạn sử dụng cho từng vật tư
    for (const expiryItem of prepareAllocationDto.danhSachHanSuDung) {
      const supplyItem = allocation.danhSachVatTu.find(
        item => item.vatTu.toString() === expiryItem.vatTu
      );
      
      if (supplyItem) {
        supplyItem.hanSuDung = new Date(expiryItem.hanSuDung);
      }
    }

    // Trừ tồn kho
    for (const item of allocation.danhSachVatTu) {
      const supply = await this.findSupplyById(item.vatTu.toString());
      
      if (supply.tonKho < item.soLuong) {
        throw new BadRequestException(
          `Vật tư "${supply.tenVatTu}" không đủ số lượng`
        );
      }

      supply.tonKho -= item.soLuong;
      await supply.save();

      // Lưu lịch sử xuất kho
      await this.saveHistory({
        vatTu: supply._id,
        loaiThayDoi: HistoryType.XUAT_CAP,
        soLuong: -item.soLuong,
        lyDo: `Xuất cấp cho ${(allocation.phongKham as any).tenPhongKham} - Mã phiếu: ${allocation.maPhieu}`,
        nguoiThucHien: allocation.nguoiTaoPhieu,
        phieuCapPhat: allocation._id,
        thoiGian: new Date(),
      });

      // Cập nhật trạng thái vật tư
      await this.updateSupplyStatus(supply._id.toString());
    }

    allocation.trangThai = AllocationStatus.CHUAN_BI_HANG;
    return allocation.save();
  }

  // Xác nhận đã giao
  async confirmDelivery(id: string, confirmDeliveryDto: ConfirmDeliveryDto): Promise<SupplyAllocationDocument> {
    const allocation = await this.findAllocationById(id);
    
    if (allocation.trangThai !== AllocationStatus.CHUAN_BI_HANG) {
      throw new BadRequestException('Phiếu không ở trạng thái chuẩn bị hàng');
    }

    allocation.trangThai = AllocationStatus.DA_GIAO;
    allocation.ngayGiao = new Date(confirmDeliveryDto.ngayGiao);
    allocation.ghiChu = confirmDeliveryDto.ghiChu;
    allocation.anhGiaoNhan = confirmDeliveryDto.anhGiaoNhan;
    allocation.nguoiGiaoHang = confirmDeliveryDto.nguoiGiaoHang as any;
    allocation.thoiGianGiao = new Date();

    return allocation.save();
  }

  // Xóa phiếu và hoàn kho
  async deleteAllocation(id: string): Promise<void> {
    const allocation = await this.findAllocationById(id);

    // Nếu đã chuẩn bị hàng hoặc đã giao, hoàn lại kho
    if (allocation.trangThai === AllocationStatus.CHUAN_BI_HANG || 
        allocation.trangThai === AllocationStatus.DA_GIAO) {
      
      for (const item of allocation.danhSachVatTu) {
        const supply = await this.findSupplyById(item.vatTu.toString());
        supply.tonKho += item.soLuong;
        await supply.save();

        // Lưu lịch sử hoàn kho
        await this.saveHistory({
          vatTu: supply._id,
          loaiThayDoi: HistoryType.HOAN_KHO,
          soLuong: item.soLuong,
          lyDo: `Hoàn kho do xóa phiếu ${allocation.maPhieu}`,
          nguoiThucHien: allocation.nguoiTaoPhieu,
          phieuCapPhat: allocation._id,
          thoiGian: new Date(),
        });

        // Cập nhật trạng thái vật tư
        await this.updateSupplyStatus(supply._id.toString());
      }
    }

    await this.allocationModel.findByIdAndDelete(id).exec();
  }

  // Cập nhật trạng thái gửi Zalo
  async markZaloSent(id: string): Promise<SupplyAllocationDocument> {
    const allocation = await this.allocationModel
      .findByIdAndUpdate(id, { daGuiZalo: true }, { new: true })
      .exec();
    
    if (!allocation) {
      throw new NotFoundException('Không tìm thấy phiếu cấp phát');
    }
    
    return allocation;
  }

  // ============ LỊCH SỬ ============

  async getSupplyHistory(supplyId: string, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<SupplyHistoryDocument[]> {
    // Convert string to ObjectId for proper MongoDB query
    const objectId = new Types.ObjectId(supplyId);
    
    const filter: any = { vatTu: objectId };
    
    if (params?.startDate || params?.endDate) {
      filter.thoiGian = {};
      if (params.startDate) {
        filter.thoiGian.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.thoiGian.$lte = endDate;
      }
    }

    const history = await this.historyModel
      .find(filter)
      .populate('nguoiThucHien', 'hoTen')
      .populate('phieuCapPhat', 'maPhieu')
      .sort({ thoiGian: -1 })
      .exec();
    
    return history;
  }

  private async saveHistory(data: any): Promise<SupplyHistoryDocument> {
    const history = new this.historyModel(data);
    return history.save();
  }
}
