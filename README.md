# Screen Sharing LAN

Ứng dụng chia sẻ màn hình qua mạng LAN sử dụng Tauri + WebSocket.

## Tính năng

- **Giáo viên**: Capture màn hình và broadcast qua WebSocket server
- **Học sinh**: Kết nối và xem màn hình giáo viên real-time
- Hoạt động hoàn toàn offline qua mạng LAN
- Tùy chỉnh FPS và port

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm run tauri dev
```

## Sử dụng

### Máy Giáo viên
1. Chọn "Giáo viên"
2. Cấu hình Port (mặc định 9000) và FPS (mặc định 10)
3. Nhấn "Bắt đầu chia sẻ"
4. Gửi địa chỉ IP:Port cho học sinh

### Máy Học sinh
1. Chọn "Học sinh"
2. Nhập địa chỉ IP:Port của giáo viên (ví dụ: 192.168.1.100:9000)
3. Nhấn "Kết nối"

## Yêu cầu

- Tất cả máy phải cùng mạng LAN
- Firewall cho phép port được sử dụng (mặc định 9000)

## Build

```bash
npm run tauri build
```
