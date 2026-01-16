# Hướng dẫn cài đặt & sử dụng hệ thống chia sẻ màn hình

## 📋 Giới thiệu

Hệ thống chia sẻ màn hình qua mạng LAN sử dụng công nghệ WebSocket để truyền hình ảnh thời gian thực từ máy giáo viên đến nhiều máy học sinh trong cùng mạng nội bộ.

### Đặc điểm:
- ✅ Hoạt động hoàn toàn offline (không cần Internet)
- ✅ Truyền trực tiếp qua WebSocket
- ✅ Hỗ trợ nhiều học sinh cùng lúc
- ✅ Độ trễ thấp, phù hợp phòng máy 30-50 máy
- ✅ Không cần cài đặt phần mềm phức tạp

---

## 📦 Tải ứng dụng

Tải file `.exe` từ:
- **GitHub Releases**: [Link tải](https://github.com/your-repo/releases)
- **Forum**: [Link forum]

Sau khi tải về, bạn sẽ có file: `Screen-Sharing-LAN_x.x.x_x64-setup.exe`

---

## 🖥️ Thiết lập máy GIÁO VIÊN

### Bước 1: Cài đặt ứng dụng

1. Chạy file `Screen-Sharing-LAN_x.x.x_x64-setup.exe`
2. Làm theo hướng dẫn cài đặt
3. Sau khi cài xong, mở ứng dụng

### Bước 2: Cấu hình Firewall

**Quan trọng**: Windows Firewall phải cho phép ứng dụng kết nối mạng.

#### Cách 1: Tự động (Khuyến nghị)
- Khi chạy app lần đầu, Windows sẽ hiện popup
- Click **"Allow access"** hoặc **"Cho phép truy cập"**

#### Cách 2: Thủ công
1. Mở **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Chọn **Port** → Next
4. Chọn **TCP**, nhập port **9000** (hoặc port bạn chọn) → Next
5. Chọn **Allow the connection** → Next
6. Check tất cả: Domain, Private, Public → Next
7. Đặt tên "Screen Sharing" → Finish

#### Cách 3: PowerShell (Nhanh nhất)
Mở PowerShell **as Administrator** và chạy:

```powershell
New-NetFirewallRule -DisplayName "Screen Sharing Port 9000" -Direction Inbound -Protocol TCP -LocalPort 9000 -Action Allow -Profile Any
```

### Bước 3: Khởi động chia sẻ

1. Mở ứng dụng
2. Chọn **"👨‍🏫 Giáo viên"**
3. Cấu hình:
   - **Port**: 9000 (mặc định, có thể đổi)
   - **FPS**: 10 (khuyến nghị 8-12 cho mượt)
4. Click **"▶️ Bắt đầu chia sẻ"**

### Bước 4: Lấy địa chỉ kết nối

Sau khi bắt đầu chia sẻ, màn hình sẽ hiển thị:

```
IP: 192.168.1.12
Địa chỉ kết nối: 192.168.1.12:9000
```

**Ghi chú địa chỉ này** để cung cấp cho học sinh.

### Bước 5: Theo dõi kết nối

Khi học sinh kết nối thành công, bạn sẽ thấy:
- Danh sách học sinh đã kết nối
- Địa chỉ IP của từng máy học sinh

---

## 👨‍🎓 Thiết lập máy HỌC SINH

### Bước 1: Cài đặt ứng dụng

1. Chạy file `Screen-Sharing-LAN_x.x.x_x64-setup.exe`
2. Làm theo hướng dẫn cài đặt
3. Sau khi cài xong, mở ứng dụng

### Bước 2: Kết nối đến giáo viên

1. Mở ứng dụng
2. Chọn **"👨‍🎓 Học sinh"**
3. Nhập **địa chỉ giáo viên** (ví dụ: `192.168.1.12:9000`)
4. Click **"🔗 Kết nối"**

### Bước 3: Xem màn hình

- Sau khi kết nối thành công, màn hình giáo viên sẽ hiển thị
- Trạng thái: **🟢 Đã kết nối**
- Click **"Ngắt kết nối"** để thoát

---

## ⚙️ Cài đặt nâng cao

### Thay đổi Port

Nếu port 9000 bị xung đột, có thể đổi sang port khác:

**Trên máy giáo viên:**
1. Trước khi bắt đầu chia sẻ
2. Đổi Port thành: 8080, 3000, hoặc 5000
3. Nhớ mở firewall cho port mới

**Trên máy học sinh:**
- Nhập địa chỉ với port mới: `192.168.1.12:8080`

### Tối ưu FPS

| FPS | Mô tả | Phù hợp |
|-----|-------|---------|
| 5-8 | Tiết kiệm băng thông | Mạng yếu, nhiều máy |
| 10-12 | Cân bằng (Khuyến nghị) | Phòng máy thông thường |
| 15-20 | Mượt mà | Mạng tốt, ít máy |

### Kiểm tra kết nối

**Trên máy giáo viên**, mở PowerShell:

```powershell
# Kiểm tra server đang chạy
netstat -an | findstr :9000

# Phải thấy: TCP    0.0.0.0:9000    0.0.0.0:0    LISTENING
```

**Trên máy học sinh**, test kết nối:

```powershell
Test-NetConnection -ComputerName 192.168.1.12 -Port 9000
```

Kết quả phải là: `TcpTestSucceeded: True`

---

## 🔧 Xử lý sự cố

### Lỗi: "Connection refused" hoặc "Timeout"

**Nguyên nhân**: Firewall chặn hoặc server chưa chạy

**Giải pháp**:
1. Kiểm tra máy giáo viên đã click "Bắt đầu chia sẻ" chưa
2. Kiểm tra firewall (xem Bước 2 phần Giáo viên)
3. Thử tắt firewall tạm để test:
   ```powershell
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
   ```
4. Kiểm tra cả 2 máy cùng mạng LAN (cùng dải IP 192.168.x.x)

### Lỗi: Hình ảnh bị giật, lag

**Giải pháp**:
1. Giảm FPS xuống 8-10
2. Kiểm tra mạng LAN có bị chậm không
3. Đóng các ứng dụng khác đang dùng mạng
4. Nếu quá nhiều học sinh, chia thành 2 nhóm

### Lỗi: Không thấy địa chỉ IP

**Giải pháp**:
1. Kiểm tra máy có kết nối mạng không
2. Chạy lệnh để xem IP:
   ```powershell
   ipconfig
   ```
3. Tìm dòng "IPv4 Address" trong phần "Ethernet adapter" hoặc "Wi-Fi"

### Lỗi: Màn hình đen

**Giải pháp**:
1. Cấp quyền Screen Recording cho app:
   - Windows: Settings → Privacy → Screen Recording
2. Khởi động lại ứng dụng

---

## 📊 Yêu cầu hệ thống

### Tối thiểu
- **OS**: Windows 10 (64-bit)
- **RAM**: 4GB
- **CPU**: Intel Core i3 hoặc tương đương
- **Mạng**: LAN 100Mbps

### Khuyến nghị
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 8GB
- **CPU**: Intel Core i5 hoặc tốt hơn
- **Mạng**: LAN Gigabit (1000Mbps)

---

## 💡 Mẹo sử dụng

1. **Kiểm tra trước giờ học**: Test kết nối 5-10 phút trước
2. **Dùng dây LAN**: Ổn định hơn Wi-Fi
3. **Đóng app không cần thiết**: Giảm tải CPU
4. **FPS 10 là đủ**: Không cần quá cao
5. **Ghi nhớ IP**: Lưu địa chỉ IP giáo viên để dùng lại

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Đọc kỹ phần "Xử lý sự cố"
2. Kiểm tra log trong ứng dụng
3. Liên hệ: [email/forum support]

---

## 📝 Changelog

### Version 1.0.0
- ✅ Chia sẻ màn hình qua WebSocket
- ✅ Hỗ trợ nhiều học sinh
- ✅ Tối ưu hiệu năng với xcap
- ✅ Gửi binary JPEG (không dùng base64)
