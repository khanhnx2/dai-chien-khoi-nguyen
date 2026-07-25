---
phase: 4
title: Art & Personalization
status: completed
priority: P2
effort: 1-2d
dependencies:
  - 3
---

# Phase 4: Art & Personalization

## Overview
Thay placeholder bằng nghệ thuật thật: pipeline avatar (copy → tách nền → ghép thân + animation ném/bắn), mặt tiền 2 thành có biển hiệu, reskin lính theo chủ đề quán, âm thanh + hiệu ứng, và các màn hình menu/kết quả tử tế.

## Requirements
- Functional: nhân vật nóc là mặt thật + thân hoạt hình có động tác; 2 thành hiển thị biển "Quán Phở Anh Khôi" / "Tạp hoá Thảo Nguyên"; có âm thanh & hiệu ứng.
- Non-functional: asset nằm trong `assets/` (bundle được, chạy trên Pages); dung lượng gọn.

## Architecture
- **Asset pipeline (bắt buộc cho web build):**
  1. Copy `~/Desktop/geometry dash/assets/characters/player-{khoi,nguyen}.png` → `assets/characters/`.
  2. Tách nền bằng RMBG (media-processing skill) → `player-{khoi,nguyen}-cutout.png`.
  3. Ghép thân hoạt hình: thân + tay vẽ đơn giản (hoặc tạo bằng ai-artist); đầu = cutout. Xuất spritesheet/frames cho động tác ném (Khôi) / bắn (Nguyên).
- `preload-scene.ts`: nạp mọi asset (avatar, thân, biển, lính, đạn, âm thanh).
- `roof-attacker.ts` (mở rộng): render thân + head cutout, chạy animation tay khi bắn.
- `base.ts` (mở rộng): vẽ mặt tiền quán + biển hiệu chữ (Text hoặc ảnh biển).
- Lính reskin: đổi texture 3 lính theo phe (Khôi: tô phở/ớt...; Nguyên: snack/chai nước...), giữ nguyên cơ chế.
- `src/audio/sound-manager.ts` — nhạc nền + SFX (đẻ lính, bắn, trúng, thắng/thua).
- Hiệu ứng: particle khi trứng nổ / nước bắn, số damage bay lên (tùy chọn nhẹ).
- Menu/Result scene: hình nền, avatar 2 phe, nút đẹp.

## Related Code Files
- Create: `assets/characters/*`, `assets/bases/*`, `assets/units/*`, `assets/audio/*`
- Create: `src/audio/sound-manager.ts`
- Modify: `src/scenes/{preload,menu,battle}-scene.ts`
- Modify: `src/entities/{roof-attacker,base,unit,projectile}.ts` (dùng texture thật + animation)
- Modify: `src/ui/battle-hud.ts` (icon/skin nút)

## Implementation Steps
1. Copy 2 avatar vào `assets/characters/`.
2. Chạy RMBG tách nền → cutout tròn/sạch.
3. Dựng thân hoạt hình + frames động tác (ai-artist hoặc vẽ tay); xuất PNG/spritesheet.
4. Tạo/tìm asset: mặt tiền 2 quán + biển hiệu, 3 skin lính mỗi phe, đạn (trứng/nước), background.
5. `preload-scene.ts`: nạp toàn bộ; thêm loading bar.
6. Gắn texture + animation vào entities (nóc thành bắn có vung tay, lính reskin, đạn có hình).
7. `sound-manager.ts`: nạp & phát nhạc/SFX; nút bật/tắt âm.
8. Thêm particle/hiệu ứng nổ trứng, tia nước.
9. Làm đẹp Menu (chọn phe có avatar) + Result (thắng/thua có avatar phe thắng).

## Success Criteria
- [ ] Nhân vật nóc = mặt thật (đã tách nền) + thân, có động tác ném/bắn
- [ ] 2 thành hiển thị đúng biển "Quán Phở Anh Khôi" / "Tạp hoá Thảo Nguyên"
- [ ] 3 lính mỗi phe có skin theo chủ đề
- [ ] Có nhạc nền + SFX chính, bật/tắt được
- [ ] Menu & Result hiển thị avatar 2 phe
- [ ] Tất cả asset load từ `assets/` (không đường dẫn tuyệt đối), build OK

## Risk Assessment
- Ghép mặt thật + thân trông "kỳ". Mitigation: giữ tỉ lệ đầu/thân hợp lý, style chibi che khớp nối; ưu tiên avatar tròn.
- Asset nặng làm Pages tải chậm. Mitigation: nén PNG, gộp spritesheet, âm thanh ogg/mp3 ngắn.
- ai-artist tạo lệch style giữa 2 nhân vật. Mitigation: cùng prompt/style, tạo cặp cùng lúc.
