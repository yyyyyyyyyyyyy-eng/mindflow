#!/usr/bin/env python3
"""生成 MindFlow 占位应用图标（1024×1024 RGBA PNG）。

正式发布前可替换为设计图标：把新图放到 src-tauri/icons/icon.png 后
运行 `pnpm dlx @tauri-apps/cli icon src-tauri/icons/icon.png` 重新生成全套。

设计：靛蓝圆角方块 + 白色「中心节点—分支」思维导图母题。
纯 Python（struct + zlib）实现，零第三方依赖，可复现。
"""
import struct
import zlib

W = H = 1024
INDIGO = (79, 124, 247, 255)    # #4F7CF7
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# 圆角矩形参数
INSET, RADIUS = 64, 176

# 母题：中心节点 + 两个子节点 + 两条分支
A = (330, 512)   # 中心节点
B = (700, 290)   # 子节点 1
C = (700, 734)   # 子节点 2
R_A, R_B, R_C = 78, 52, 52
LINE_W = 24      # 分支线半宽


def seg_dist(px, py, x1, y1, x2, y2):
    """点到线段距离"""
    dx, dy = x2 - x1, y2 - y1
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    cx, cy = x1 + t * dx, y1 + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def in_rounded_rect(x, y):
    if not (INSET <= x < W - INSET and INSET <= y < H - INSET):
        return False
    for cx, cy in ((INSET + RADIUS, INSET + RADIUS),
                   (W - INSET - RADIUS, INSET + RADIUS),
                   (INSET + RADIUS, H - INSET - RADIUS),
                   (W - INSET - RADIUS, H - INSET - RADIUS)):
        in_x = (x < INSET + RADIUS if cx == INSET + RADIUS else x >= W - INSET - RADIUS)
        in_y = (y < INSET + RADIUS if cy == INSET + RADIUS else y >= H - INSET - RADIUS)
        if in_x and in_y and ((x - cx) ** 2 + (y - cy) ** 2) > RADIUS * RADIUS:
            return False
    return True


def pixel(x, y):
    # 白色母题：三个圆 + 两条线
    if (x - A[0]) ** 2 + (y - A[1]) ** 2 <= R_A ** 2:
        return WHITE
    if (x - B[0]) ** 2 + (y - B[1]) ** 2 <= R_B ** 2:
        return WHITE
    if (x - C[0]) ** 2 + (y - C[1]) ** 2 <= R_C ** 2:
        return WHITE
    if seg_dist(x, y, A[0] + R_A * 0.7, A[1] - R_A * 0.7, B[0] - R_B, B[1]) <= LINE_W // 2:
        return WHITE
    if seg_dist(x, y, A[0] + R_A * 0.7, A[1] + R_A * 0.7, C[0] - R_C, C[1]) <= LINE_W // 2:
        return WHITE
    if in_rounded_rect(x, y):
        return INDIGO
    return TRANSPARENT


def png(path):
    rows = bytearray()
    for y in range(H):
        rows.append(0)  # filter: none
        for x in range(W):
            rows.extend(pixel(x, y))

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)  # 8bit RGBA
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(bytes(rows), 9)))
        f.write(chunk(b'IEND', b''))


if __name__ == '__main__':
    png('src-tauri/icons/icon.png')
    print('icon.png 已生成')
