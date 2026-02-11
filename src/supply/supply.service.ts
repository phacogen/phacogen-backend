import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { Supply, SupplyDocument, SupplyStatus } from './schemas/supply.schema';
import { SupplyAllocation, SupplyAllocationDocument, AllocationStatus, DeliveryMethod } from './schemas/supply-allocation.schema';
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
    // Generate mã phiếu: PC + ddMMyyHHmmss + random 3 digits to prevent duplicates
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    const maPhieu = `PC${day}${month}${year}${hour}${minute}${second}${random}`;

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

  // Cập nhật phiếu cấp phát (chỉ cho phép khi ở trạng thái CHO_CHUAN_BI)
  async updateAllocation(id: string, updateData: Partial<CreateAllocationDto>): Promise<SupplyAllocationDocument> {
    const allocation = await this.findAllocationById(id);
    
    // Chỉ cho phép sửa khi phiếu ở trạng thái chờ chuẩn bị
    if (allocation.trangThai !== AllocationStatus.CHO_CHUAN_BI) {
      throw new BadRequestException('Chỉ có thể sửa phiếu ở trạng thái chờ chuẩn bị');
    }

    // Nếu có thay đổi danh sách vật tư, kiểm tra tồn kho
    if (updateData.danhSachVatTu) {
      for (const item of updateData.danhSachVatTu) {
        const supply = await this.findSupplyById(item.vatTu);
        if (supply.tonKho < item.soLuong) {
          throw new BadRequestException(
            `Vật tư "${supply.tenVatTu}" không đủ số lượng. Tồn kho: ${supply.tonKho}, Yêu cầu: ${item.soLuong}`
          );
        }
      }
    }

    // Cập nhật thông tin
    Object.assign(allocation, updateData);
    return allocation.save();
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

  // ============ EXCEL IMPORT/EXPORT ============

  async generateExcelTemplate(): Promise<any> {
    // Get all supplies and clinics for reference
    const supplies = await this.supplyModel.find().select('maVatTu tenVatTu').exec();
    const clinics = await this.allocationModel.db.collection('clinics').find().toArray();

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template for data entry
    const templateData = [
      ['Mã PK', 'Mã VT', 'Số lượng', 'Hình thức vận chuyển'],
      ['PK001', 'VT001', 10, 'CAP_TAN_NOI'],
      ['PK001', 'VT002', 5, 'GUI_CHUYEN_PHAT'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Nhập liệu');

    // Sheet 2: Clinic reference
    const clinicData = [['Mã PK', 'Tên phòng khám']];
    clinics.forEach((clinic: any) => {
      clinicData.push([clinic.maPhongKham, clinic.tenPhongKham]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(clinicData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Danh sách PK');

    // Sheet 3: Supply reference
    const supplyData = [['Mã VT', 'Tên vật tư', 'Tồn kho']];
    supplies.forEach((supply: any) => {
      supplyData.push([supply.maVatTu, supply.tenVatTu, supply.tonKho]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(supplyData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Danh sách VT');

    // Sheet 4: Instructions
    const instructions = [
      ['HƯỚNG DẪN NHẬP PHIẾU CẤP PHÁT VẬT TƯ'],
      [''],
      ['1. Mã PK: Nhập mã phòng khám (xem sheet "Danh sách PK")'],
      ['2. Mã VT: Nhập mã vật tư (xem sheet "Danh sách VT")'],
      ['3. Số lượng: Nhập số lượng cần cấp (số nguyên dương)'],
      ['4. Hình thức vận chuyển: Chọn một trong các giá trị sau:'],
      ['   - CAP_TAN_NOI: Cấp tận nơi'],
      ['   - GUI_CHUYEN_PHAT: Gửi chuyển phát'],
      ['   - GUI_XE_SHIP: Gửi xe, Ship'],
      [''],
      ['LƯU Ý:'],
      ['- Mỗi dòng là một vật tư cấp cho một phòng khám'],
      ['- Nếu cùng phòng khám nhận nhiều vật tư, ghi nhiều dòng với cùng Mã PK'],
      ['- Hệ thống sẽ tự động gộp các dòng cùng Mã PK thành một phiếu'],
      ['- Kiểm tra tồn kho trước khi nhập để tránh lỗi'],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, ws4, 'Hướng dẫn');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      buffer,
      filename: `Mau_Nhap_Cap_Phat_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }

  async importAllocationsFromExcel(file: Express.Multer.File, nguoiTaoPhieu: string): Promise<any> {
    if (!file) {
      throw new BadRequestException('Không có file được tải lên');
    }

    try {
      // Read Excel file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        throw new BadRequestException('File Excel không có sheet nào');
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new BadRequestException('File Excel không có dữ liệu');
      }

      // Validate and group by clinic
      const groupedByClinic: Map<string, any[]> = new Map();
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // Excel row number (header is row 1)

        // Skip empty rows
        if (!row['Mã PK'] && !row['Mã VT'] && !row['Số lượng'] && !row['Hình thức vận chuyển']) {
          continue;
        }

        // Validate required fields
        if (!row['Mã PK']) {
          errors.push(`Dòng ${rowNum}: Thiếu Mã PK`);
          continue;
        }
        if (!row['Mã VT']) {
          errors.push(`Dòng ${rowNum}: Thiếu Mã VT`);
          continue;
        }
        const quantity = Number(row['Số lượng']);
        if (!row['Số lượng'] || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
          errors.push(`Dòng ${rowNum}: Số lượng không hợp lệ (phải là số nguyên dương)`);
          continue;
        }
        if (!row['Hình thức vận chuyển']) {
          errors.push(`Dòng ${rowNum}: Thiếu hình thức vận chuyển`);
          continue;
        }

        // Validate delivery method
        const validMethods = ['CAP_TAN_NOI', 'GUI_CHUYEN_PHAT', 'GUI_XE_SHIP'];
        if (!validMethods.includes(row['Hình thức vận chuyển'])) {
          errors.push(`Dòng ${rowNum}: Hình thức vận chuyển không hợp lệ`);
          continue;
        }

        // Find clinic
        const clinic = await this.allocationModel.db.collection('clinics').findOne({
          maPhongKham: row['Mã PK'],
        });
        if (!clinic) {
          errors.push(`Dòng ${rowNum}: Không tìm thấy phòng khám với mã "${row['Mã PK']}"`);
          continue;
        }

        // Find supply
        const supply = await this.supplyModel.findOne({ maVatTu: row['Mã VT'] }).exec();
        if (!supply) {
          errors.push(`Dòng ${rowNum}: Không tìm thấy vật tư với mã "${row['Mã VT']}"`);
          continue;
        }

        // Group by clinic and delivery method
        const clinicKey = `${clinic._id}_${row['Hình thức vận chuyển']}`;
        if (!groupedByClinic.has(clinicKey)) {
          groupedByClinic.set(clinicKey, []);
        }

        groupedByClinic.get(clinicKey)!.push({
          vatTu: supply._id.toString(),
          tenVatTu: supply.tenVatTu,
          soLuong: Number(row['Số lượng']),
          phongKham: clinic._id,
          hinhThucVanChuyen: row['Hình thức vận chuyển'],
          tonKho: supply.tonKho, // Store current stock for validation later
        });
      }

      if (errors.length > 0) {
        throw new BadRequestException({
          message: 'Có lỗi trong file Excel',
          errors,
        });
      }

      // Validate stock BEFORE creating any allocations
      // Track total usage across ALL allocations to prevent overselling
      const totalSupplyUsage: Map<string, number> = new Map();
      
      for (const [, items] of groupedByClinic.entries()) {
        for (const item of items) {
          const currentUsage = totalSupplyUsage.get(item.vatTu) || 0;
          totalSupplyUsage.set(item.vatTu, currentUsage + item.soLuong);
        }
      }
      
      // Check if we have enough stock for ALL allocations combined
      for (const [supplyId, totalQty] of totalSupplyUsage.entries()) {
        const supply = await this.findSupplyById(supplyId);
        if (supply.tonKho < totalQty) {
          throw new BadRequestException(
            `Vật tư "${supply.tenVatTu}" không đủ tồn kho. Tồn: ${supply.tonKho}, Tổng yêu cầu: ${totalQty}`
          );
        }
      }

      // Create allocations with small delay to prevent duplicate maPhieu
      const createdAllocations = [];
      for (const [, items] of groupedByClinic.entries()) {
        const firstItem = items[0];
        
        const allocationDto: CreateAllocationDto = {
          phongKham: firstItem.phongKham,
          hinhThucVanChuyen: firstItem.hinhThucVanChuyen as DeliveryMethod,
          danhSachVatTu: items.map(item => ({
            vatTu: item.vatTu,
            tenVatTu: item.tenVatTu,
            soLuong: item.soLuong,
          })),
          nguoiTaoPhieu,
        };

        const allocation = await this.createAllocation(allocationDto);
        createdAllocations.push(allocation);
        
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      return {
        success: true,
        message: `Đã tạo ${createdAllocations.length} phiếu cấp phát thành công`,
        allocations: createdAllocations,
      };
    } catch (error) {
      console.error('Excel import error:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      
      throw new BadRequestException('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
    }
  }
}
