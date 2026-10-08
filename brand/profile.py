import math, random
from PIL import Image, ImageDraw

S, SS = 1080, 4                      # output size, supersampling
W = S * SS
PAPER, INK, ACCENT = (244, 241, 234), (29, 28, 26), (181, 72, 47)
rng = random.Random(1967)            # LeWitt, "Paragraphs on Conceptual Art"

img = Image.new("RGB", (W, W), PAPER)
d = ImageDraw.Draw(img)
c = W / 2

def wobbly_square(half, angle, dx, dy, width, color):
    # Hand-drawn square: each side is a slightly trembling polyline.
    corners = [(-half, -half), (half, -half), (half, half), (-half, half)]
    ca, sa = math.cos(angle), math.sin(angle)
    pts = []
    for i in range(4):
        (x0, y0), (x1, y1) = corners[i], corners[(i + 1) % 4]
        # low-frequency tremble: two sine waves with random phase
        f1, f2 = rng.uniform(0, 6.3), rng.uniform(0, 6.3)
        nx, ny = -(y1 - y0), (x1 - x0)
        ln = math.hypot(nx, ny); nx, ny = nx / ln, ny / ln
        for t in [k / 60 for k in range(60)]:
            off = (2.2 * math.sin(t * 7 + f1) + 1.2 * math.sin(t * 17 + f2)) * SS
            x = x0 + (x1 - x0) * t + nx * off
            y = y0 + (y1 - y0) * t + ny * off
            pts.append((c + dx + x * ca - y * sa, c + dy + x * sa + y * ca))
    pts.append(pts[0])
    d.line(pts, fill=color, width=width, joint="curve")

n = 11
outer = 330 * SS                      # fits inside the circular crop
accent_ring = 7
for i in range(n):
    half = outer * (1 - i / n)
    disorder = 0.01 + 0.07 * (i / n)  # "1% de désordre", growing inward
    angle = rng.gauss(0, disorder)
    dx, dy = rng.gauss(0, 4 * SS * i / n), rng.gauss(0, 4 * SS * i / n)
    color = ACCENT if i == accent_ring else INK
    wobbly_square(half, angle, dx, dy, (14 if i == accent_ring else 9) * SS, color)

img = img.resize((S, S), Image.LANCZOS)
img.save("instagram-profile-1080.png", optimize=True)

# Preview: circular crop at real Instagram size
small = img.resize((320, 320), Image.LANCZOS)
mask = Image.new("L", (320, 320), 0)
ImageDraw.Draw(mask).ellipse((0, 0, 319, 319), fill=255)
prev = Image.new("RGB", (360, 360), (255, 255, 255))
prev.paste(small, (20, 20), mask)
tiny = img.resize((110, 110), Image.LANCZOS)
m2 = Image.new("L", (110, 110), 0); ImageDraw.Draw(m2).ellipse((0, 0, 109, 109), fill=255)
out = Image.new("RGB", (520, 360), (255, 255, 255))
out.paste(prev, (0, 0)); out.paste(tiny, (390, 125), m2)
out.save("preview.png")
