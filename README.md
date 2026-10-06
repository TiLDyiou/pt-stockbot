# PhuocThinh Stockbot - Workspace Phân tích Cổ phiếu Việt Nam

Ứng dụng phân tích cổ phiếu Việt Nam (HOSE, HNX, UPCoM) tương tác thời gian thực kết hợp AI Chatbot (Vercel AI SDK) và Dashboard kéo thả với biểu đồ TradingView Lightweight Charts.

## 1. Tính năng chính

- **AI Agent Chatbot tiếng Việt**:
  - Tự động gọi các công cụ (tools) lấy thị giá, lịch sử, chỉ báo kỹ thuật, báo cáo tài chính và bối cảnh thị trường.
  - Trả lời ngắn gọn, trực diện, đính kèm thời điểm dữ liệu (`as_of`).
  - Tự động quét mã trong câu trả lời để hiện chip "Xem biểu đồ {mã}".
- **Bảng điều khiển tương tác (Dashboard)**:
  - Các widget kéo thả sắp xếp bằng `@dnd-kit`.
  - Thay đổi kích thước linh hoạt (1 cột, 2 cột, toàn màn hình).
  - Tự động lưu cấu hình layout vào `localStorage` của trình duyệt.
- **Biểu đồ chứng khoán chuyên sâu (TradingView Lightweight Charts)**:
  - Nến Nhật (Candlestick) chuẩn màu thị trường Việt Nam (xanh/đỏ).
  - Thanh khối lượng (Volume) ở pane phụ bên dưới.
  - Tùy chọn đường trung bình động SMA (20, 50).
  - Bộ chọn khung thời gian (1M, 3M, 6M, 1Y).
  - Chế độ so sánh % biến động với mã thứ hai.
  - Toàn bộ dữ liệu nến được tải từ server qua `/api/candles`.
- **Danh mục theo dõi (Watchlist)**:
  - Kéo thả để sắp xếp lại các mã cổ phiếu.
  - Sparkline mini trực quan hóa xu hướng giá gần nhất.
  - Bấm vào mã để mở chart hoặc chèn câu hỏi phân tích.
  - Nút "So sánh watchlist" để so sánh tối đa 5 mã.
- **Kiến trúc Serverless 100% Stateless**:
  - Không cần CSDL. Toàn bộ lịch sử chat, watchlist, và dashboard layout được lưu an toàn tại `localStorage`.
  - Bộ nhớ đệm in-memory TTL với cơ chế **single-flight** chống stampede và điều chỉnh TTL động theo giờ giao dịch thị trường Việt Nam (Asia/Ho_Chi_Minh).

---

## 2. Hướng dẫn Deploy lên Vercel

1. **Import Repository**:
   - Đẩy mã nguồn lên GitHub/GitLab.
   - Truy cập [Vercel Dashboard](https://vercel.com) và bấm **Add New... -> Project**, chọn repository của bạn.
2. **Cấu hình Region**:
   - Trong mục **Project Settings -> Functions -> Function Region**, chọn region gần Việt Nam nhất (khuyến nghị: **Singapore - `sin1`**) để tối ưu độ trễ mạng khi truy vấn dữ liệu chứng khoán.
3. **Cấu hình Biến Môi trường (Environment Variables)**:
   - Thêm các biến môi trường sau trên Vercel:
     - `LLM_MODEL`: Tên model (ví dụ: `gemini-2.5-flash`, `gpt-4o-mini`, hoặc `claude-3-5-sonnet-20241022`).
     - `AI_PROVIDER`: `google`, `openai`, hoặc `anthropic`.
     - `GOOGLE_GENERATIVE_AI_API_KEY`: API Key của Google AI Studio (nếu dùng Gemini).
     - `OPENAI_API_KEY`: API Key của OpenAI (nếu dùng OpenAI).
     - `ANTHROPIC_API_KEY`: API Key của Anthropic (nếu dùng Claude).
     - `MAX_OUTPUT_TOKENS`: `1200` (mặc định).
     - `HEALTH_TOKEN`: Chuỗi token bảo mật cho endpoint `/api/health`.
     - `VNSTOCK_TIMEOUT_MS`: `8000` (mặc định 8 giây).
     - `ENABLE_NEWS`: `false` (bật `true` nếu muốn kích hoạt tool tin tức).
4. **Deploy**:
   - Bấm **Deploy**. Vercel sẽ tự động build và cung cấp domain HTTPS miễn phí.

---

## 3. Ghi chú về Gói Dịch vụ Vercel

- **Vercel Hobby Plan**: Chỉ áp dụng cho mục đích cá nhân, học tập hoặc thử nghiệm phi thương mại.
- **Vercel Pro Plan**: Bắt buộc khi sử dụng ứng dụng cho mục đích thương mại, doanh nghiệp hoặc phục vụ lượng người dùng lớn để đảm bảo giới hạn execution time và bandwidth.

---

## 4. Ghi chú Quan trọng về Nguồn Dữ liệu

- Thư viện `vnstock-js` lấy dữ liệu từ các endpoint công khai không chính thức của các công ty chứng khoán tại Việt Nam. Các endpoint này có thể thay đổi cấu trúc dữ liệu, phản hồi chậm hoặc bị giới hạn/chặn truy cập bất kỳ lúc nào mà không báo trước.
- Ứng dụng chỉ phục vụ mục đích thông tin và học thuật, không phải là hệ thống cung cấp dữ liệu giao dịch chính thức được cấp phép.
- Vui lòng đọc kỹ các điều khoản sử dụng dữ liệu trước khi sử dụng cho bất kỳ mục đích thương mại nào.

---

## 5. Chạy thử nghiệm ở môi trường cục bộ (Local Development)

```bash
# Cài đặt dependencies
npm install

# Sao chép biến môi trường
cp .env.example .env.local

# Chạy server phát triển
npm run dev

# Kiểm tra kiểu TypeScript
npm run typecheck

# Kiểm tra Linting
npm run lint

# Build bản phát hành
npm run build
```
