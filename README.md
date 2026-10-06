# PhuocThinh Stockbot

> PhuocThinh Stockbot là không gian làm việc trực quan hỗ trợ tìm kiếm, theo dõi và phân tích dữ liệu chứng khoán Việt Nam. Ứng dụng kết hợp bảng điều khiển tương tác nhiều phân hệ và trợ lý trí tuệ nhân tạo, giúp người dùng phổ thông tiếp cận dữ liệu tài chính rõ ràng, thuận tiện.

## 1. Mục tiêu và phạm vi ứng dụng

Hệ thống được phát triển nhằm phục vụ mục đích nghiên cứu học thuật, học tập cá nhân và thử nghiệm các mô hình tương tác dữ liệu tài chính thời gian thực.

Dự án hướng đến các nhóm người dùng:
1. Người mới tìm hiểu thị trường chứng khoán cần giao diện trực quan, dễ thao tác.
2. Nhà đầu tư cá nhân cần một màn hình làm việc tập trung để theo dõi đồng thời biểu đồ kỹ thuật, chỉ số cơ bản và tin tức.
3. Người nghiên cứu công nghệ và sinh viên quan tâm đến ứng dụng trí tuệ nhân tạo trong xử lý dữ liệu tài chính.

Hệ thống vận hành theo mô hình xử lý trực tiếp trên trình duyệt web của người dùng. Mọi tùy biến giao diện, danh mục cổ phiếu quan tâm và nhật ký trò chuyện đều được lưu trữ cục bộ trong bộ nhớ trình duyệt, không yêu cầu tạo tài khoản và không lưu trữ thông tin cá nhân trên máy chủ.

## 2. Các phân hệ chức năng

| Phân hệ | Nội dung chức năng | Ý nghĩa sử dụng |
| :--- | :--- | :--- |
| Biểu đồ kỹ thuật và định giá | Hiển thị nến giá, khối lượng giao dịch, các đường trung bình động và cho phép so sánh tỷ lệ biến động giá giữa hai cổ phiếu. Bảng chỉ số P/E, P/B, P/S, PEG hiển thị ngay bên dưới đồ thị. | Cung cấp cái nhìn toàn diện về lịch sử giá và mức định giá hiện tại của doanh nghiệp trong tương quan với mức bình quân của toàn ngành. |
| Tin tức thị trường | Tổng hợp các bài viết từ nhiều nguồn báo chí tài chính trong nước, tự động phân loại mức độ liên quan và loại bỏ tin tức không thuộc lĩnh vực kinh tế. | Mặc định cung cấp bức tranh vĩ mô của toàn thị trường. Khi người dùng tra cứu một mã cụ thể, hệ thống ưu tiên hiển thị các bài viết về chính doanh nghiệp hoặc lĩnh vực kinh doanh liên quan. |
| Trợ lý trí tuệ nhân tạo | Tiếp nhận câu hỏi bằng tiếng Việt thông thường và tự động truy xuất dữ liệu thị trường để phản hồi trực tiếp. | Hỗ trợ giải đáp nhanh các thắc mắc về thị giá, biến động khối lượng và các chỉ số tài chính cơ bản kèm mốc thời gian ghi nhận dữ liệu. |
| Danh mục theo dõi | Lưu trữ danh sách các cổ phiếu quan tâm với đồ thị thu nhỏ dạng đường nét và hỗ trợ chế độ so sánh nhanh. | Giúp người dùng theo dõi diễn biến của nhiều mã cổ phiếu cùng lúc mà không cần mở từng cửa sổ riêng biệt. |
| Bố cục tùy biến | Hỗ trợ kéo thả thay đổi vị trí giữa các phân hệ, chuyển đổi chế độ xem một cột hoặc hai cột, và mở rộng toàn màn hình. | Cho phép người dùng tự do sắp xếp không gian làm việc theo thói quen quan sát cá nhân. |

## 3. Nguồn dữ liệu và tính minh bạch học thuật

> [!IMPORTANT]
> **Tuyên bố về nguồn dữ liệu và miễn trừ trách nhiệm pháp lý**
> 
> 1. Nguồn dữ liệu: Ứng dụng thu thập dữ liệu công khai từ các công ty chứng khoán và cơ quan báo chí tại Việt Nam thông qua thư viện mã nguồn mở vnstock-js. Đây không phải cổng cung cấp dữ liệu giao dịch chính thức được cấp phép từ các sở giao dịch chứng khoán.
> 2. Độ ổn định và độ trễ: Dữ liệu có thể xuất hiện độ trễ so với bảng giá thực tế tại sàn giao dịch hoặc gặp gián đoạn tạm thời khi các cổng thông tin nguồn thay đổi cấu trúc kỹ thuật.
> 3. Giới hạn trách nhiệm: Mọi phân tích, chỉ số tài chính và câu trả lời từ trí tuệ nhân tạo chỉ mang tính chất tham khảo học thuật. Ứng dụng không đưa ra khuyến nghị đầu tư, tư vấn mua bán hay cam kết hiệu quả tài chính. Người dùng cần tự kiểm chứng thông tin và chịu trách nhiệm với mọi quyết định cá nhân.

## 4. Hướng dẫn cài đặt và vận hành cục bộ

Các bước cài đặt được thiết kế tối giản để người dùng không chuyên về lập trình có thể tự chạy ứng dụng trên máy tính cá nhân.

### Bước 1. Chuẩn bị môi trường

Máy tính cần có môi trường Node.js từ phiên bản 18 trở lên. Người dùng có thể kiểm tra hoặc cài đặt bộ cài chính thức tại địa chỉ nodejs.org.

### Bước 2. Tải mã nguồn

Mở ứng dụng dòng lệnh trên máy tính và thực hiện tải dự án:

```bash
git clone https://github.com/TiLDyiou/pt-stockbot.git
cd pt-stockbot
```

### Bước 3. Cài đặt các gói thành phần

Chạy lệnh sau để tải các thư viện cần thiết:

```bash
npm install
```

### Bước 4. Thiết lập khóa truy cập trí tuệ nhân tạo

Sao chép tệp cấu hình mẫu sang tệp cấu hình thực tế:

```bash
cp .env.example .env.local
```

Mở tệp `.env.local` bằng phần mềm ghi chú bất kỳ và bổ sung khóa API. Ví dụ đối với dịch vụ Google Gemini:

```env
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=khoa_api_cua_ban
LLM_MODEL=gemini-2.5-flash
```

Nếu muốn sử dụng dịch vụ OpenAI, người dùng thay đổi cấu hình tương ứng:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=khoa_api_cua_ban
LLM_MODEL=gpt-4o-mini
```

### Bước 5. Khởi động ứng dụng

Thực thi lệnh chạy môi trường phát triển:

```bash
npm run dev
```

Khi màn hình hiển thị thông báo sẵn sàng, mở trình duyệt web và truy cập địa chỉ:

```
http://localhost:3000
```

## 5. Hướng dẫn xuất bản lên nền tảng Vercel

Ứng dụng có thể được đưa lên mạng Internet miễn phí thông qua các bước sau:

1. Đưa toàn bộ thư mục dự án lên tài khoản GitHub cá nhân.
2. Đăng nhập vào trang vercel.com, chọn mục tạo dự án mới và liên kết với kho lưu trữ trên GitHub.
3. Trong mục thiết lập vị trí máy chủ, ưu tiên chọn khu vực Singapore mã sin1 nhằm tối ưu tốc độ kết nối về Việt Nam.
4. Sao chép các thông số cấu hình trong tệp `.env.local` vào phần thiết lập biến môi trường trên Vercel.
5. Nhấn nút hoàn tất để nền tảng tự động biên dịch và tạo đường dẫn truy cập trực tuyến.
