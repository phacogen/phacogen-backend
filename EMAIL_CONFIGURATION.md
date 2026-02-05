# Hướng dẫn cấu hình Email

## Tính năng
Khi bấm nút "Hoàn thành kiểm tra", hệ thống sẽ tự động gửi email thông báo cho phòng khám (nếu phòng khám có cấu hình địa chỉ email).

## Cấu hình SMTP

### 1. Sử dụng Gmail

#### Bước 1: Tạo App Password cho Gmail
1. Đăng nhập vào tài khoản Gmail
2. Truy cập: https://myaccount.google.com/security
3. Bật "2-Step Verification" (Xác minh 2 bước)
4. Sau khi bật, vào "App passwords" (Mật khẩu ứng dụng)
5. Chọn "Mail" và "Other (Custom name)"
6. Nhập tên: "Phacogen Lab System"
7. Click "Generate" và copy mật khẩu 16 ký tự

#### Bước 2: Cấu hình file .env
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
```

### 2. Sử dụng SMTP Server khác

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

## Cấu hình Email cho Phòng khám

Để phòng khám nhận được email thông báo, cần cấu hình email trong thông tin phòng khám:

1. Vào trang "Quản lý phòng khám"
2. Chỉnh sửa thông tin phòng khám
3. Nhập địa chỉ email vào trường "Email"
4. Lưu lại

## Nội dung Email

Email sẽ bao gồm:
- Tiêu đề: "Thông báo hoàn thành kiểm tra - Lệnh [Mã lệnh]"
- Nội dung:
  - Tên phòng khám
  - Mã lệnh
  - Thời gian hoàn thành kiểm tra
  - Thông tin liên hệ

## Kiểm tra

### Test gửi email
1. Cấu hình SMTP trong file .env
2. Khởi động lại server: `npm run start:dev`
3. Tạo một lệnh thu mẫu mới
4. Gán cho nhân viên và chuyển trạng thái đến "Hoàn thành"
5. Bấm "Hoàn thành kiểm tra"
6. Kiểm tra email của phòng khám

### Xem log
Kiểm tra console log để xem trạng thái gửi email:
- Thành công: `Email sent successfully to [email]`
- Lỗi: `Error sending email: [error message]`

## Lưu ý

1. **Bảo mật**: Không commit file .env lên Git
2. **App Password**: Sử dụng App Password thay vì mật khẩu thật cho Gmail
3. **Firewall**: Đảm bảo server có thể kết nối đến SMTP server (port 587 hoặc 465)
4. **Email không gửi được**: 
   - Kiểm tra cấu hình SMTP
   - Kiểm tra email phòng khám có đúng không
   - Xem log trong console
   - Kiểm tra spam folder của email nhận

## Troubleshooting

### Lỗi: "Missing credentials for PLAIN"
**Nguyên nhân**: File .env không được load hoặc thiếu package @nestjs/config
**Giải pháp**:
1. Cài đặt package: `npm install @nestjs/config`
2. Đảm bảo ConfigModule đã được import trong app.module.ts
3. Khởi động lại server sau khi thay đổi .env
4. Kiểm tra SMTP_USER và SMTP_PASS không có khoảng trắng
5. **QUAN TRỌNG**: App Password của Gmail có dạng "xxxx xxxx xxxx xxxx" nhưng phải nhập vào .env KHÔNG CÓ KHOẢNG TRẮNG: "xxxxxxxxxxxxxxxx"

### Lỗi: "Invalid login"
- Kiểm tra lại SMTP_USER và SMTP_PASS
- Với Gmail, đảm bảo đã tạo App Password
- Xóa tất cả khoảng trắng trong App Password

### Lỗi: "Connection timeout"
- Kiểm tra firewall
- Thử đổi SMTP_PORT sang 465 và SMTP_SECURE=true

### Email vào spam
- Cấu hình SPF, DKIM records cho domain
- Sử dụng email domain chính thức thay vì Gmail
