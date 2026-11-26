#!/usr/bin/env python3
"""소셜 미리보기 이미지(public/og-image.png, 1200x630)를 만든다.
사용법: python3 scripts/make-og-image.py   (Pillow 필요, npm install 후 실행)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / 'node_modules/pretendard/dist/public/static'
W, H = 1200, 630

img = Image.new('RGB', (W, H), '#0a1a33')
d = ImageDraw.Draw(img)
# 대각선 그라데이션 느낌의 블루 띠
for i in range(H):
    t = i / H
    d.line([(0, i), (W, i)], fill=(int(10 + 2 * t), int(26 + 40 * t), int(51 + 120 * t)))
d.rectangle([0, 0, 18, H], fill='#3d8bff')

logo = Image.open(ROOT / 'src/assets/brand/logo-dark.png')
logo = logo.resize((int(logo.width * 1.6), int(logo.height * 1.6)), Image.LANCZOS)
img.paste(logo, (90, 110), logo)

bold = ImageFont.truetype(str(FONT_DIR / 'Pretendard-Bold.otf'), 76)
reg = ImageFont.truetype(str(FONT_DIR / 'Pretendard-Regular.otf'), 34)
d.text((90, 250), 'GTG Vertica 블로그', font=bold, fill='#ffffff')
d.text((90, 360), '대용량 데이터 분석을 위한 컬럼 기반 MPP 데이터베이스', font=reg, fill='#c4dcff')
d.text((90, 410), 'Vertica Analytics Database(Vertica) 이야기', font=reg, fill='#c4dcff')
d.text((90, 530), 'x2wizard.github.io/vertica', font=reg, fill='#7fb0ff')

img.save(ROOT / 'public/og-image.png', optimize=True)
print('public/og-image.png 생성')
