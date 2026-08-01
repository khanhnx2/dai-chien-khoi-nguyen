---
phase: 5
title: Build verify & visual check
status: completed
priority: P2
effort: 45m
dependencies:
  - 4
---

# Phase 5: Build verify & visual check

## Overview
Verify build/test toàn bộ + kiểm mắt trong dev server: ảnh zombie thật, dù khi rơi, toast, đổ bộ đúng vị trí.

## Requirements
- Functional: xác nhận trực quan những gì test logic không phủ được (hình ảnh, animation, vị trí thực tế trên canvas).
- Non-functional: `npm run build` + `npm test` xanh trước khi verify UI.

## Architecture
- Dùng dev server (`npm run dev`) + JS eval qua browser devtools (pattern đã dùng cho titan/cannon trước đây: set localStorage, force-start battle ở stage 40, hạ hp thành Máy trực tiếp qua JS để trigger nhanh thay vì chờ combat thật).

## Related Code Files
- (không sửa code — chỉ verify)

## Implementation Steps
1. `npm run build && npm test` — xanh tuyệt đối.
2. Mở dev server, vào trận với `stage:40`, `playerSide` bất kỳ.
3. Qua console: `battle.bases[aiSide].hp = battle.bases[aiSide].maxHp * 0.7` để trigger nhanh (không cần đánh thật 25% máu).
4. Screenshot xác nhận: toast "🧟 ZOMBIE ĐỔ BỘ!" hiện; 10 zombie xuất hiện rải rác nửa sân Máy (không dồn cụm); mỗi zombie có ảnh thật (không phải emoji) + hiệu ứng dù lúc đang rơi (dù biến mất sau khi chạm đất).
5. Đợi/step thêm 1s (qua JS gọi lại `battle.zombieDrops.update` hoặc chờ thời gian thực) → xác nhận đợt 2 rơi thêm 10 con, không toast lặp lại.
6. Kiểm không có lỗi console trong suốt quá trình.
7. Dọn localStorage về trạng thái sạch sau khi test xong (như các lần verify trước).

## Success Criteria
- [ ] Build + test xanh.
- [ ] Toast đúng 1 lần lúc kích hoạt, không lặp lại mỗi đợt rơi.
- [ ] Zombie hiện ảnh thật, có dù lúc rơi, vị trí rải rác nửa sân Máy (không phải 1 điểm cố định).
- [ ] Không lỗi console.
- [ ] localStorage sạch sau khi verify.

## Risk Assessment
- Renderer trình duyệt từng bị kẹt do HMR churn nhiều lần trong các phiên trước — nếu gặp lại, restart dev server sạch (`preview_stop` + `preview_start`) thay vì cố gỡ qua nhiều lần navigate.
- Nếu ảnh dù trông xấu/lỗi ở bước 4, ghi nhận làm nợ kỹ thuật (không chặn merge — chỉ là polish hình ảnh, cơ chế logic vẫn đúng).
