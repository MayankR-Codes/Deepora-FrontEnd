"""
Deepora Brand Asset Generator
Generates:
1. favicon.svg (Vector favicon with dark/light adaptability)
2. favicon.ico (Multi-size: 16, 32, 48)
3. favicon-16x16.png
4. favicon-32x32.png
5. apple-touch-icon.png (180x180)
6. android-chrome-192x192.png
7. android-chrome-512x512.png
8. assets/og-image.jpg (1200x630 OpenGraph / Social Share image)
9. assets/og-image.png (1200x630 lossless)
10. assets/og-square.jpg (800x800 WhatsApp / Square preview)
11. assets/twitter-card.jpg (1200x630 Twitter summary_large_image)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

BASE_DIR = r"c:\Users\KIIT\Documents\Deepora-FrontEnd"
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. GENERATE FAVICON.SVG
# -------------------------------------------------------------
def generate_favicon_svg():
    svg_code = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Background Radial Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e1711" />
      <stop offset="55%" stop-color="#0e0c0a" />
      <stop offset="100%" stop-color="#050504" />
    </radialGradient>

    <!-- Outer Rim Metallic Gold Gradient -->
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eec77e" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#73552b" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#eec77e" stop-opacity="0.6" />
    </linearGradient>

    <!-- Diya Bowl Metallic Gradient -->
    <linearGradient id="bowlGrad" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#e5be74" />
      <stop offset="22%" stop-color="#fff2d0" />
      <stop offset="50%" stop-color="#b68128" />
      <stop offset="80%" stop-color="#6e4d14" />
      <stop offset="100%" stop-color="#3d2706" />
    </linearGradient>

    <!-- Diya Top Rim Gradient -->
    <linearGradient id="topRimGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#a87a29" />
      <stop offset="35%" stop-color="#fff5dc" />
      <stop offset="70%" stop-color="#dfb970" />
      <stop offset="100%" stop-color="#734e12" />
    </linearGradient>

    <!-- Ambient Flame Glow Behind -->
    <radialGradient id="ambientGlow" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="#ff9924" stop-opacity="0.55" />
      <stop offset="40%" stop-color="#d96e10" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Outer Flame Gradient -->
    <linearGradient id="flameOuter" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#d9440f" />
      <stop offset="42%" stop-color="#f58818" />
      <stop offset="82%" stop-color="#ffd55c" />
      <stop offset="100%" stop-color="#fffaea" />
    </linearGradient>

    <!-- Inner Flame Core Gradient -->
    <linearGradient id="flameCore" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#f89d26" />
      <stop offset="50%" stop-color="#fff2b3" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>

    <!-- Star Glow Gradient -->
    <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#fedb7a" />
      <stop offset="80%" stop-color="#d4af67" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#d4af67" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Base Rounded Squircle -->
  <rect x="14" y="14" width="484" height="484" rx="120" fill="url(#bgGrad)" stroke="url(#rimGrad)" stroke-width="4.5" />

  <!-- Ambient Flame Glow Behind Flame -->
  <circle cx="256" cy="225" r="170" fill="url(#ambientGlow)" />

  <!-- Diya Bowl Main Body -->
  <path d="M108,266 C108,382 176,418 256,418 C336,418 404,382 404,266 C364,286 312,295 256,295 C200,295 148,286 108,266 Z" fill="url(#bowlGrad)" />

  <!-- Top Rim of Diya Bowl -->
  <ellipse cx="256" cy="266" rx="148" ry="29" fill="#1b140d" stroke="url(#topRimGrad)" stroke-width="5" />

  <!-- Inner Oil Pool Glow -->
  <ellipse cx="256" cy="268" rx="122" ry="19" fill="#38210c" />
  <ellipse cx="256" cy="269" rx="80" ry="10" fill="#693b11" opacity="0.85" />

  <!-- Diya Flame - Outer -->
  <path d="M256,106 C290,178 326,222 312,264 C299,298 213,298 200,264 C186,222 222,178 256,106 Z" fill="url(#flameOuter)" />

  <!-- Diya Flame - Inner Core -->
  <path d="M256,146 C275,194 294,228 284,256 C275,276 237,276 228,256 C218,228 237,194 256,146 Z" fill="url(#flameCore)" />

  <!-- Flame Brilliant Heart -->
  <ellipse cx="256" cy="244" rx="15" ry="24" fill="#ffffff" opacity="0.95" />

  <!-- Radiant Deepora 8-Point Star at Flame Zenith -->
  <g transform="translate(256, 96)">
    <!-- Vertical / Horizontal Ray -->
    <polygon points="0,-36 5.5,-8 30,0 5.5,8 0,36 -5.5,8 -30,0 -5.5,-8" fill="url(#starGlow)" />
    <!-- Diagonal Rays -->
    <polygon points="0,-25 4,-6 21,0 4,6 0,25 -4,6 -21,0 -4,-6" transform="rotate(45)" fill="url(#starGlow)" opacity="0.9" />
    <!-- Center Spark -->
    <circle cx="0" cy="0" r="4" fill="#ffffff" />
  </g>
</svg>'''
    path = os.path.join(BASE_DIR, "favicon.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg_code)
    print(f"Created {path}")

# -------------------------------------------------------------
# 2. GENERATE HIGH-RES MASTER ICON IN PILLOW (1024x1024)
# -------------------------------------------------------------
def create_master_icon():
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # We will draw on layers and composite
    # Layer 1: Background Squircle with Subtle Gradient and Gold Rim
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_bg = ImageDraw.Draw(bg)
    
    # Rounded rectangle coordinates
    pad = 32
    radius = 240
    # Draw dark base
    draw_bg.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=(12, 10, 8, 255),
        outline=(212, 175, 103, 160),
        width=8
    )
    
    # Layer 2: Radial warm ambient lighting inside the squircle
    ambient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_amb = ImageDraw.Draw(ambient)
    center_x, center_y = 512, 450
    for r in range(400, 0, -20):
        alpha = int(45 * (1.0 - (r / 400.0) ** 1.3))
        draw_amb.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=(245, 150, 40, alpha)
        )
    ambient = ambient.filter(ImageFilter.GaussianBlur(35))
    
    # Composite ambient onto bg, clipped to rounded rectangle
    mask = Image.new("L", (size, size), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=255)
    bg.paste(ambient, (0, 0), mask)
    
    # Layer 3: Diya Bowl & Flame
    elements = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_el = ImageDraw.Draw(elements)
    
    # Flame Glow
    flame_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_fg = ImageDraw.Draw(flame_glow)
    for r in range(260, 0, -15):
        alpha = int(70 * (1.0 - (r / 260.0) ** 1.2))
        draw_fg.ellipse(
            [512 - r, 420 - r, 512 + r, 420 + r],
            fill=(255, 140, 20, alpha)
        )
    flame_glow = flame_glow.filter(ImageFilter.GaussianBlur(25))
    elements.paste(flame_glow, (0, 0), flame_glow)
    
    # Outer Flame polygon/path
    # Flame tip at (512, 220), wide at (400, 530) and (624, 530), bottom at (512, 590)
    flame_outer_pts = []
    # Right curve
    for t in range(0, 51):
        progress = t / 50.0
        # Bezier interpolation
        # P0=(512, 210), P1=(670, 360), P2=(630, 530), P3=(512, 590)
        x = (1-progress)**3 * 512 + 3*(1-progress)**2*progress * 670 + 3*(1-progress)*progress**2 * 630 + progress**3 * 512
        y = (1-progress)**3 * 210 + 3*(1-progress)**2*progress * 360 + 3*(1-progress)*progress**2 * 530 + progress**3 * 590
        flame_outer_pts.append((x, y))
    # Left curve
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**3 * 512 + 3*(1-progress)**2*progress * 394 + 3*(1-progress)*progress**2 * 354 + progress**3 * 512
        y = (1-progress)**3 * 590 + 3*(1-progress)**2*progress * 530 + 3*(1-progress)*progress**2 * 360 + progress**3 * 210
        flame_outer_pts.append((x, y))
    
    draw_el.polygon(flame_outer_pts, fill=(245, 120, 20, 255))
    
    # Inner Flame polygon
    flame_inner_pts = []
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**3 * 512 + 3*(1-progress)**2*progress * 620 + 3*(1-progress)*progress**2 * 590 + progress**3 * 512
        y = (1-progress)**3 * 290 + 3*(1-progress)**2*progress * 390 + 3*(1-progress)*progress**2 * 510 + progress**3 * 550
        flame_inner_pts.append((x, y))
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**3 * 512 + 3*(1-progress)**2*progress * 434 + 3*(1-progress)*progress**2 * 404 + progress**3 * 512
        y = (1-progress)**3 * 550 + 3*(1-progress)**2*progress * 510 + 3*(1-progress)*progress**2 * 390 + progress**3 * 290
        flame_inner_pts.append((x, y))
    draw_el.polygon(flame_inner_pts, fill=(255, 218, 90, 255))
    
    # Core Brilliant White-Gold Flame
    draw_el.ellipse([512 - 28, 470, 512 + 28, 540], fill=(255, 255, 255, 245))
    
    # Diya Bowl (Bottom Body)
    bowl_pts = []
    # Left edge: 216, 532
    # Bottom center: 512, 836
    # Right edge: 808, 532
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**2 * 216 + 2*(1-progress)*progress * 260 + progress**2 * 512
        y = (1-progress)**2 * 532 + 2*(1-progress)*progress * 836 + progress**2 * 836
        bowl_pts.append((x, y))
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**2 * 512 + 2*(1-progress)*progress * 764 + progress**2 * 808
        y = (1-progress)**2 * 836 + 2*(1-progress)*progress * 836 + progress**2 * 532
        bowl_pts.append((x, y))
    # Top rim curve back to left
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**2 * 808 + 2*(1-progress)*progress * 512 + progress**2 * 216
        y = (1-progress)**2 * 532 + 2*(1-progress)*progress * 590 + progress**2 * 532
        bowl_pts.append((x, y))
    
    draw_el.polygon(bowl_pts, fill=(194, 142, 54, 255))
    
    # Diya Bowl Shading / Inner Highlight
    bowl_inner_pts = []
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**2 * 240 + 2*(1-progress)*progress * 280 + progress**2 * 512
        y = (1-progress)**2 * 546 + 2*(1-progress)*progress * 800 + progress**2 * 800
        bowl_inner_pts.append((x, y))
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**2 * 512 + 2*(1-progress)*progress * 744 + progress**2 * 784
        y = (1-progress)**2 * 800 + 2*(1-progress)*progress * 800 + progress**2 * 546
        bowl_inner_pts.append((x, y))
    for t in range(0, 51):
        progress = t / 50.0
        x = (1-progress)**2 * 784 + 2*(1-progress)*progress * 512 + progress**2 * 240
        y = (1-progress)**2 * 546 + 2*(1-progress)*progress * 580 + progress**2 * 546
        bowl_inner_pts.append((x, y))
    draw_el.polygon(bowl_inner_pts, fill=(225, 182, 94, 255))
    
    # Diya Rim Ellipse
    draw_el.ellipse([216, 502, 808, 562], fill=(24, 18, 12, 255), outline=(235, 195, 115, 255), width=8)
    # Inner oil glow
    draw_el.ellipse([260, 512, 764, 552], fill=(60, 36, 14, 255))
    draw_el.ellipse([340, 518, 684, 546], fill=(120, 68, 22, 200))
    
    # 8-Point Star at Flame Zenith (512, 190)
    star_x, star_y = 512, 190
    def draw_star(draw, cx, cy, r_outer, r_inner, color):
        for angle_offset in [0, 45]:
            rad_off = math.radians(angle_offset)
            r_out = r_outer if angle_offset == 0 else r_outer * 0.72
            r_in = r_inner if angle_offset == 0 else r_inner * 0.72
            pts = []
            for i in range(8):
                ang = rad_off + i * math.pi / 2
                pts.append((cx + r_out * math.sin(ang), cy - r_out * math.cos(ang)))
                ang_mid = ang + math.pi / 4
                pts.append((cx + r_in * math.sin(ang_mid), cy - r_in * math.cos(ang_mid)))
            draw.polygon(pts, fill=color)

    # Ambient star glow
    star_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_sg = ImageDraw.Draw(star_glow)
    draw_sg.ellipse([star_x - 120, star_y - 120, star_x + 120, star_y + 120], fill=(255, 220, 100, 140))
    star_glow = star_glow.filter(ImageFilter.GaussianBlur(18))
    elements.paste(star_glow, (0, 0), star_glow)

    # Star rays
    draw_star(draw_el, star_x, star_y, 72, 12, (255, 230, 130, 255))
    draw_star(draw_el, star_x, star_y, 50, 9, (255, 255, 255, 255))
    draw_el.ellipse([star_x - 8, star_y - 8, star_x + 8, star_y + 8], fill=(255, 255, 255, 255))
    
    # Combine background and elements
    img = Image.alpha_composite(bg, elements)
    return img

def export_favicons(master_img):
    # Sizes to export
    sizes = {
        "android-chrome-512x512.png": 512,
        "android-chrome-192x192.png": 192,
        "apple-touch-icon.png": 180,
        "favicon-32x32.png": 32,
        "favicon-16x16.png": 16,
    }
    
    for filename, s in sizes.items():
        out_path = os.path.join(BASE_DIR, filename)
        resized = master_img.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(out_path, "PNG", optimize=True)
        print(f"Exported {out_path} ({s}x{s})")
        
    # Also export multi-resolution favicon.ico
    ico_path = os.path.join(BASE_DIR, "favicon.ico")
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    ico_imgs = [master_img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_imgs[0].save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Exported {ico_path} with sizes {ico_sizes}")

# -------------------------------------------------------------
# 3. GENERATE OPEN GRAPH & TWITTER CARD SEO IMAGES
# -------------------------------------------------------------
def generate_og_images():
    width, height = 1200, 630
    
    # 1. Base Canvas with Deep Obsidian / Ember Radial Gradient
    og = Image.new("RGBA", (width, height), (10, 9, 8, 255)) # #0a0908
    draw = ImageDraw.Draw(og)
    
    # Right-side ambient warm radial glow
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    center_gx, center_gy = 880, 315
    for r in range(550, 50, -25):
        alpha = int(48 * (1.0 - (r / 550.0) ** 1.3))
        glow_draw.ellipse(
            [center_gx - r, center_gy - r, center_gx + r, center_gy + r],
            fill=(180, 85, 20, alpha)
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(40))
    og = Image.alpha_composite(og, glow_layer)
    
    # 2. Right-Side Featured Diya Composite
    # We will pick 'Festive Hand-Painted Diwali Diya.png' or 'Handcrafted Diya Festive Glow.png'
    diya_source = os.path.join(ASSETS_DIR, "Festive Hand-Painted Diwali Diya.png")
    if not os.path.exists(diya_source):
        diya_source = os.path.join(ASSETS_DIR, "og-diya.jpg")
    
    if os.path.exists(diya_source):
        diya_im = Image.open(diya_source).convert("RGBA")
        
        # Center-crop to square 800x800 around the diya
        dw, dh = diya_im.size
        crop_size = min(dw, dh)
        left = (dw - crop_size) // 2
        top = (dh - crop_size) // 2
        diya_cropped = diya_im.crop((left, top, left + crop_size, top + crop_size))
        
        # Target size for the circular spotlight: 520x520
        spot_size = 530
        diya_resized = diya_cropped.resize((spot_size, spot_size), Image.Resampling.LANCZOS)
        
        # Create a smooth circular / soft-edge vignette mask
        mask = Image.new("L", (spot_size, spot_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        center_m = spot_size // 2
        # Soft radial alpha
        for r in range(center_m, 0, -2):
            norm = r / float(center_m)
            # Cubic easing for seamless feather into dark background
            if norm > 0.82:
                val = int(255 * (1.0 - ((norm - 0.82) / 0.18) ** 1.8))
            else:
                val = 255
            mask_draw.ellipse([center_m - r, center_m - r, center_m + r, center_m + r], fill=val)
        
        mask = mask.filter(ImageFilter.GaussianBlur(6))
        
        # Paste into OG image on the right side
        pos_x = width - spot_size - 40
        pos_y = (height - spot_size) // 2
        
        # Delicate outer golden border ring around spotlight
        ring_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        ring_draw = ImageDraw.Draw(ring_layer)
        rc_x = pos_x + spot_size // 2
        rc_y = pos_y + spot_size // 2
        ring_radius = (spot_size // 2) + 2
        ring_draw.ellipse(
            [rc_x - ring_radius, rc_y - ring_radius, rc_x + ring_radius, rc_y + ring_radius],
            outline=(212, 175, 103, 110),
            width=2
        )
        # Outer soft glow around ring
        ring_draw.ellipse(
            [rc_x - ring_radius - 8, rc_y - ring_radius - 8, rc_x + ring_radius + 8, rc_y + ring_radius + 8],
            outline=(245, 160, 50, 45),
            width=6
        )
        
        og.paste(diya_resized, (pos_x, pos_y), mask)
        og = Image.alpha_composite(og, ring_layer)
    
    # 3. Typography & Brand Elements (Left Section)
    text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(text_layer)
    
    # Load fonts
    font_path_serif = "C:/Windows/Fonts/georgiab.ttf"
    font_path_serif_reg = "C:/Windows/Fonts/georgia.ttf"
    font_path_sans = "C:/Windows/Fonts/arial.ttf"
    font_path_sans_bold = "C:/Windows/Fonts/arialbd.ttf"
    
    font_brand = ImageFont.truetype(font_path_serif, 46) if os.path.exists(font_path_serif) else ImageFont.load_default()
    font_eyebrow = ImageFont.truetype(font_path_sans_bold, 13) if os.path.exists(font_path_sans_bold) else ImageFont.load_default()
    font_headline = ImageFont.truetype(font_path_serif, 66) if os.path.exists(font_path_serif) else ImageFont.load_default()
    font_headline_italic = ImageFont.truetype("C:/Windows/Fonts/georgiai.ttf", 66) if os.path.exists("C:/Windows/Fonts/georgiai.ttf") else font_headline
    font_sub = ImageFont.truetype(font_path_sans, 19) if os.path.exists(font_path_sans) else ImageFont.load_default()
    font_pill = ImageFont.truetype(font_path_sans_bold, 12) if os.path.exists(font_path_sans_bold) else ImageFont.load_default()
    
    # Top Eyebrow Tag: [ ✳ THE ART OF LIGHT  |  EST. 2026 ]
    start_x = 88
    eyebrow_y = 78
    
    # Draw star mark
    t_draw.text((start_x, eyebrow_y - 2), "✳", fill=(226, 187, 105, 255), font=font_eyebrow)
    t_draw.text((start_x + 22, eyebrow_y), "A NEW LIGHT, ROOTED IN TIME", fill=(212, 175, 103, 240), font=font_eyebrow)
    
    # Thin horizontal accent rule
    t_draw.line([(start_x, eyebrow_y + 26), (start_x + 480, eyebrow_y + 26)], fill=(65, 52, 38, 200), width=1)
    
    # Brand Wordmark: DEEPORA.
    # DEEP in ivory (#f2eee5), ORA in gold (#d4af67), dot in gold
    brand_y = 132
    t_draw.text((start_x, brand_y), "DEEP", fill=(242, 238, 229, 255), font=font_brand)
    # Calculate width of DEEP
    bbox_deep = font_brand.getbbox("DEEP")
    deep_w = bbox_deep[2] - bbox_deep[0]
    t_draw.text((start_x + deep_w + 3, brand_y), "ORA", fill=(212, 175, 103, 255), font=font_brand)
    bbox_ora = font_brand.getbbox("ORA")
    ora_w = bbox_ora[2] - bbox_ora[0]
    t_draw.text((start_x + deep_w + ora_w + 5, brand_y), ".", fill=(212, 175, 103, 255), font=font_brand)
    
    # Main Editorial Headline: "Tradition, reimagined."
    head_y = 212
    t_draw.text((start_x, head_y), "Tradition,", fill=(245, 240, 230, 255), font=font_headline)
    t_draw.text((start_x, head_y + 70), "reimagined.", fill=(226, 187, 105, 255), font=font_headline_italic)
    
    # Subtitle Paragraph
    sub_y = 380
    t_draw.text(
        (start_x, sub_y),
        "A little flame. A timeless legacy.\nHandcrafted light shaped with contemporary intention.",
        fill=(199, 188, 170, 240),
        font=font_sub,
        spacing=9
    )
    
    # Feature Badges Pill Row
    badge_y = 475
    badges = [
        "HAND-PAINTED IN SMALL BATCHES",
        "DESIGNED TO BE PASSED DOWN",
        "PURE FESTIVE GLOW"
    ]
    cur_x = start_x
    for b in badges:
        bbox_b = font_pill.getbbox(b)
        bw = (bbox_b[2] - bbox_b[0]) + 20
        bh = 26
        # Pill outline
        t_draw.rounded_rectangle([cur_x, badge_y, cur_x + bw, badge_y + bh], radius=13, outline=(90, 72, 48, 220), fill=(22, 18, 14, 180), width=1)
        t_draw.text((cur_x + 10, badge_y + 6), b, fill=(212, 175, 103, 230), font=font_pill)
        cur_x += bw + 12
        if cur_x > 560:  # wrap or limit
            break
            
    # Bottom Domain & Tagline Strip
    foot_y = 548
    t_draw.line([(start_x, foot_y - 12), (width - 88, foot_y - 12)], fill=(55, 45, 33, 160), width=1)
    t_draw.text((start_x, foot_y), "DEEPORA  ·  THE ART OF LIGHT", fill=(147, 138, 121, 200), font=font_eyebrow)
    
    domain_text = "deepora.vercel.app"
    bbox_d = font_eyebrow.getbbox(domain_text)
    dw = bbox_d[2] - bbox_d[0]
    t_draw.text((width - 88 - dw, foot_y), domain_text, fill=(212, 175, 103, 230), font=font_eyebrow)
    
    og_final = Image.alpha_composite(og, text_layer)
    
    # Convert to RGB for JPEG and PNG export
    og_rgb = og_final.convert("RGB")
    
    # 1. assets/og-image.jpg
    og_jpg_path = os.path.join(ASSETS_DIR, "og-image.jpg")
    og_rgb.save(og_jpg_path, "JPEG", quality=92, optimize=True)
    print(f"Created {og_jpg_path} ({width}x{height})")
    
    # 2. assets/og-image.png
    og_png_path = os.path.join(ASSETS_DIR, "og-image.png")
    og_final.save(og_png_path, "PNG", optimize=True)
    print(f"Created {og_png_path} ({width}x{height})")
    
    # 3. assets/twitter-card.jpg
    tw_path = os.path.join(ASSETS_DIR, "twitter-card.jpg")
    og_rgb.save(tw_path, "JPEG", quality=92, optimize=True)
    print(f"Created {tw_path} ({width}x{height})")
    
    # 4. Square Version (800x800) for WhatsApp / Instagram / Mobile previews
    sq_size = 800
    sq = Image.new("RGBA", (sq_size, sq_size), (10, 9, 8, 255))
    sq_draw = ImageDraw.Draw(sq)
    
    # Square layout: Top has glowing diya, bottom has brand wordmark & headline
    if os.path.exists(diya_source):
        diya_sq = diya_cropped.resize((480, 480), Image.Resampling.LANCZOS)
        # Circular soft mask
        mask_sq = Image.new("L", (480, 480), 0)
        mask_sq_draw = ImageDraw.Draw(mask_sq)
        for r in range(240, 0, -2):
            norm = r / 240.0
            val = int(255 * (1.0 - ((norm - 0.8) / 0.2) ** 1.8)) if norm > 0.8 else 255
            mask_sq_draw.ellipse([240 - r, 240 - r, 240 + r, 240 + r], fill=val)
        mask_sq = mask_sq.filter(ImageFilter.GaussianBlur(6))
        
        sq.paste(diya_sq, ((sq_size - 480) // 2, 40), mask_sq)
        
        # Gold accent ring
        sq_draw.ellipse(
            [(sq_size - 480) // 2, 40, (sq_size + 480) // 2, 520],
            outline=(212, 175, 103, 90),
            width=2
        )
        
    # Brand typography in bottom area
    t_sq = Image.new("RGBA", (sq_size, sq_size), (0, 0, 0, 0))
    t_sq_draw = ImageDraw.Draw(t_sq)
    
    # Star mark
    t_sq_draw.text((sq_size // 2 - 8, 545), "✳", fill=(226, 187, 105, 255), font=font_eyebrow)
    
    # DEEPORA.
    deep_w = font_brand.getbbox("DEEP")[2] - font_brand.getbbox("DEEP")[0]
    ora_w = font_brand.getbbox("ORA.")[2] - font_brand.getbbox("ORA.")[0]
    total_w = deep_w + ora_w + 3
    brand_sx = (sq_size - total_w) // 2
    t_sq_draw.text((brand_sx, 575), "DEEP", fill=(242, 238, 229, 255), font=font_brand)
    t_sq_draw.text((brand_sx + deep_w + 3, 575), "ORA.", fill=(212, 175, 103, 255), font=font_brand)
    
    # Subtitle
    sub_text = "THE ART OF LIGHT  ·  HANDCRAFTED DIYAS"
    bbox_st = font_eyebrow.getbbox(sub_text)
    stw = bbox_st[2] - bbox_st[0]
    t_sq_draw.text(((sq_size - stw) // 2, 642), sub_text, fill=(212, 175, 103, 210), font=font_eyebrow)
    
    tag_text = "A little flame. A timeless legacy."
    bbox_tt = font_sub.getbbox(tag_text)
    ttw = bbox_tt[2] - bbox_tt[0]
    t_sq_draw.text(((sq_size - ttw) // 2, 676), tag_text, fill=(199, 188, 170, 220), font=font_sub)
    
    sq_final = Image.alpha_composite(sq, t_sq).convert("RGB")
    sq_path = os.path.join(ASSETS_DIR, "og-square.jpg")
    sq_final.save(sq_path, "JPEG", quality=92, optimize=True)
    print(f"Created {sq_path} ({sq_size}x{sq_size})")

if __name__ == "__main__":
    print("--- 1. Generating favicon.svg ---")
    generate_favicon_svg()
    
    print("--- 2. Generating Master High-Res Icon & Multi-Size Favicons ---")
    master = create_master_icon()
    export_favicons(master)
    
    print("--- 3. Generating Open Graph & Social SEO Images ---")
    generate_og_images()
    
    print("All assets successfully created!")
