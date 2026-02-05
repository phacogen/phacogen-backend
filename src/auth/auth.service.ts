import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../user/schemas/user.schema';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // Tìm user theo username hoặc maNhanVien
    const user = await this.userModel
      .findOne({
        $or: [{ username }, { maNhanVien: username }],
      })
      .populate('vaiTro')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // Kiểm tra password với bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // Kiểm tra tài khoản có đang hoạt động không
    if (!user.dangHoatDong) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Tạo JWT token
    const payload = { 
      sub: user._id, 
      username: user.username,
      maNhanVien: user.maNhanVien,
    };
    const accessToken = this.jwtService.sign(payload);

    // Trả về thông tin user (không bao gồm password) và token
    const userObject = user.toObject();
    delete userObject.password;

    return {
      success: true,
      message: 'Đăng nhập thành công',
      user: userObject,
      accessToken,
    };
  }

  async validateUser(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('vaiTro')
      .exec();
    
    if (!user || !user.dangHoatDong) {
      return null;
    }

    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
  }
}
