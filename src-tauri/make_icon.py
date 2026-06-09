"""Generate a 1024x1024 RGBA app icon with no third-party deps."""
import struct, zlib, math

N = 1024
buf = bytearray(N * N * 4)

def put(x, y, r, g, b, a=255):
    if 0 <= x < N and 0 <= y < N:
        i = (y * N + x) * 4
        # simple alpha-over compositing onto existing pixel
        ba = buf[i + 3]
        if a == 255 or ba == 0:
            buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a
        else:
            af = a / 255.0
            buf[i]   = int(r * af + buf[i]   * (1 - af))
            buf[i+1] = int(g * af + buf[i+1] * (1 - af))
            buf[i+2] = int(b * af + buf[i+2] * (1 - af))
            buf[i+3] = max(buf[i+3], a)

def rounded_alpha(x, y, w, h, rad):
    """Coverage (0..1) for a rounded rect filling [0,w)x[0,h)."""
    cx = min(max(x, rad), w - rad)
    cy = min(max(y, rad), h - rad)
    dx = x - cx
    dy = y - cy
    d = math.hypot(dx, dy)
    return max(0.0, min(1.0, rad - d + 0.5))

# Background: rounded square with subtle vertical gradient (Tokyo Night).
rad = 200
for y in range(N):
    t = y / N
    r = int(0x1a + (0x24 - 0x1a) * t)
    g = int(0x1b + (0x28 - 0x1b) * t)
    b = int(0x26 + (0x3b - 0x26) * t)
    for x in range(N):
        cov = rounded_alpha(x, y, N, N, rad)
        if cov > 0:
            put(x, y, r, g, b, int(255 * cov))

def thick_seg(x0, y0, x1, y1, width, col):
    half = width / 2.0
    minx = int(min(x0, x1) - half - 1); maxx = int(max(x0, x1) + half + 1)
    miny = int(min(y0, y1) - half - 1); maxy = int(max(y0, y1) + half + 1)
    vx, vy = x1 - x0, y1 - y0
    L2 = vx * vx + vy * vy
    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            t = 0.0 if L2 == 0 else ((x - x0) * vx + (y - y0) * vy) / L2
            t = max(0.0, min(1.0, t))
            px, py = x0 + t * vx, y0 + t * vy
            d = math.hypot(x - px, y - py)
            cov = max(0.0, min(1.0, half - d + 0.5))
            if cov > 0:
                put(x, y, col[0], col[1], col[2], int(255 * cov))

accent = (0x7a, 0xa2, 0xf7)
# Chevron ">"
thick_seg(360, 350, 560, 512, 70, accent)
thick_seg(560, 512, 360, 674, 70, accent)
# Prompt underscore cursor
thick_seg(620, 650, 760, 650, 64, (0xbb, 0x9a, 0xf7))

# Encode PNG
def png_chunk(tag, data):
    c = tag + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

raw = bytearray()
for y in range(N):
    raw.append(0)
    raw += buf[y * N * 4:(y + 1) * N * 4]

png = b"\x89PNG\r\n\x1a\n"
png += png_chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0))
png += png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
png += png_chunk(b"IEND", b"")

with open("app-icon.png", "wb") as f:
    f.write(png)
print("wrote app-icon.png")
