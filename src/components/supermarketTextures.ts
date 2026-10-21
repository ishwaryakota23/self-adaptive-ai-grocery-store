import * as THREE from 'three';

/**
 * Procedural texture generators for realistic supermarket packaging and architectural surfaces.
 * Uses high-resolution HTML5 canvas rendering to generate crisp, believable textures.
 */

// 1. Packaged Grocery Boxes (Cereal, Rice, Atta, Pasta, Salt)
export function createPackageBoxTexture(
  brandName: string,
  productName: string,
  packSize: string,
  primaryColor: string,
  accentColor: string,
  category: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 512, 512);

  // Top Brand Header Banner
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 512, 110);

  // Brand Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Segoe UI", Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(brandName.toUpperCase(), 256, 50);

  // Category Tag
  ctx.font = 'bold 16px "Segoe UI", Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(category.toUpperCase(), 256, 85);

  // Product Graphic / Illustration Box
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(40, 130, 432, 220, 16);
  ctx.fill();

  // Product Title on white card
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 36px "Segoe UI", Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(productName, 256, 210);

  // Pack Size Pill (Crucial for SKU verification)
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(160, 245, 192, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Segoe UI", Inter, sans-serif';
  ctx.fillText(`NET WT. ${packSize}`, 256, 277);

  // Nutritional / Organic Seals
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.arc(90, 310, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('100%', 90, 306);
  ctx.fillText('PURE', 90, 320);

  // Barcode & SKU on lower right
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(280, 380, 200, 100);
  ctx.fillStyle = '#0a0a0a';
  let bx = 295;
  while (bx < 465) {
    const bw = Math.random() > 0.45 ? 4 : 2;
    ctx.fillRect(bx, 395, bw, 60);
    bx += bw + (Math.random() > 0.5 ? 4 : 2);
  }
  ctx.font = '12px monospace';
  ctx.fillText('8 901030 381014', 380, 470);

  // Price badge lower left
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GROCERAI AUTHORITATIVE SKU', 40, 420);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`PRE-PACKAGED â€¢ ${packSize}`, 40, 445);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 2. Can / Bottle Label Texture (Canned Goods, Olive Oil, Milk)
export function createCylinderLabelTexture(
  brand: string,
  title: string,
  volume: string,
  bgColor: string,
  textColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 256);

  // Metallic rim accents
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 12);
  ctx.fillRect(0, 244, 512, 12);

  // Center Brand
  ctx.fillStyle = textColor;
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(brand.toUpperCase(), 256, 60);

  // Product Name
  ctx.font = '900 36px "Segoe UI", sans-serif';
  ctx.fillText(title, 256, 115);

  // Volume
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#059669';
  ctx.fillText(volume, 256, 160);

  // Mini barcode
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(380, 180, 110, 55);
  ctx.fillStyle = '#000000';
  let bx = 390;
  while (bx < 480) {
    const bw = Math.random() > 0.5 ? 3 : 2;
    ctx.fillRect(bx, 188, bw, 35);
    bx += bw + 3;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 3. Supermarket Porcelain Floor Tile Texture with soft reflections & grout lines
export function createSupermarketFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Light warm porcelain tile color (off-white / cream marble)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle marble grain / flecks
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(226, 232, 240, 0.4)' : 'rgba(241, 245, 249, 0.6)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Tile Grout Grid (4x4 tiles of 256px each)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 1024; i += 256) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 10);
  texture.needsUpdate = true;
  return texture;
}

// 4. Aisle Hanging Departmental Signs
export function createAisleSignTexture(
  aisleNumber: string,
  department: string,
  items: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Ivory / emerald double-sided supermarket sign
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 148);

  // Aisle number circular badge on left
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(80, 80, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AISLE', 80, 65);
  ctx.font = '900 44px "Segoe UI", sans-serif';
  ctx.fillText(aisleNumber, 80, 110);

  // Department name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Segoe UI", Inter, sans-serif';
  ctx.fillText(department.toUpperCase(), 160, 68);

  // Sub-items listed
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 18px "Segoe UI", Inter, sans-serif';
  ctx.fillText(items, 160, 112);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 5. Physical Kiosk Screen UI Textures
export function createKioskScreenTexture(
  state: 'WELCOME' | 'SESSION_QR' | 'CHECKOUT_VERIFY' | 'KIOSK_PAYMENT_QR' | 'PAYMENT_SUCCESS',
  sessionQrUrl = ''
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Screen housing background (Crisp modern retail display)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 768);

  // Top GrocerAI Header
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GROCERAI AUTONOMOUS KIOSK', 256, 45);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('KIOSK TERMINAL #01 â€¢ STORE #104', 256, 72);

  if (state === 'WELCOME') {
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px "Segoe UI", sans-serif';
    ctx.fillText('WELCOME TO GROCERAI', 256, 210);

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Experience autonomous shopping.', 256, 255);
    ctx.fillText('Shop freely through aisles with mobile + Alexa+.', 256, 285);

    // Big green "START SHOPPING" button
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.roundRect(80, 420, 352, 80, 24);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px "Segoe UI", sans-serif';
    ctx.fillText('START SHOPPING', 256, 470);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText('OR TAP PHONE / SMART CARD TO SYNC', 256, 560);
  } else if (state === 'SESSION_QR') {
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px "Segoe UI", sans-serif';
    ctx.fillText('SCAN SESSION QR', 256, 170);

    ctx.font = '17px "Segoe UI", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Open your mobile camera or GrocerAI app', 256, 210);
    ctx.fillText('Session SESS_104 will bind to your phone', 256, 235);

    // QR Code Frame
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(106, 280, 300, 300, 24);
    ctx.fill();
    ctx.stroke();

    // Procedural QR Pattern
    ctx.fillStyle = '#0f172a';
    const qrSize = 240;
    const qrStart = 136;
    const cells = 15;
    const cellSize = qrSize / cells;

    // Corner Finder Patterns
    const drawFinder = (x: number, y: number) => {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(x, y, cellSize * 5, cellSize * 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 3, cellSize * 3);
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(x + cellSize * 1.5, y + cellSize * 1.5, cellSize * 2, cellSize * 2);
    };

    drawFinder(qrStart, qrStart);
    drawFinder(qrStart + (cells - 5) * cellSize, qrStart);
    drawFinder(qrStart, qrStart + (cells - 5) * cellSize);

    // Random QR data blocks
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (
          (r < 6 && c < 6) ||
          (r < 6 && c > cells - 7) ||
          (r > cells - 7 && c < 6)
        ) {
          continue;
        }
        if ((r * 7 + c * 13) % 3 === 0 || (r + c) % 2 === 0) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(qrStart + c * cellSize, qrStart + r * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SESSION: SESS_104_ACTIVE', 256, 640);
  } else if (state === 'CHECKOUT_VERIFY') {
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 30px "Segoe UI", sans-serif';
    ctx.fillText('PHYSICAL SKU VERIFICATION', 256, 150);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Same Kiosk Recognized Session SESS_104', 256, 185);

    // 3-Way Match Verification Card
    ctx.fillStyle = '#f0fdf4';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(40, 220, 432, 280, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText('âœ“ CART = CV = BARCODE = INVENTORY', 60, 260);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('â€¢ TATA SALT (1 KG PACK)       â‚¹28  [VERIFIED]', 60, 310);
    ctx.fillText('â€¢ FORTUNE SUNFLOWER OIL (1 L) â‚¹175 [VERIFIED]', 60, 350);
    ctx.fillText('â€¢ ORGANIC PENNE PASTA (500 G) â‚¹85  [VERIFIED]', 60, 390);

    // Mismatch prevention rule display
    ctx.fillStyle = '#b45309';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('Overhead Optical CV: 3/3 Pack Sizes & Quantities Match', 60, 440);

    // Big Total
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px "Segoe UI", sans-serif';
    ctx.fillText('TOTAL: â‚¹288.00', 256, 560);

    // Proceed Button
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.roundRect(80, 600, 352, 70, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillText('DISPLAY DEMO QR', 256, 645);
  } else if (state === 'KIOSK_PAYMENT_QR') {
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px "Segoe UI", sans-serif';
    ctx.fillText('DEMO CHECKOUT QR', 256, 150);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Cart Verified â€¢ Total: â‚¹288.00', 256, 185);
    ctx.fillText('Scannable demo only Â· No money is transferred', 256, 210);

    // Payment QR Code Box on Kiosk Screen
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(106, 240, 300, 300, 24);
    ctx.fill();
    ctx.stroke();

    // Decorative QR preview for the 3D storyboard, not a payment code.
    ctx.fillStyle = '#0f172a';
    const qrSize = 240;
    const qrStart = 136;
    const cells = 15;
    const cellSize = qrSize / cells;

    const drawFinder = (x: number, y: number) => {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(x, y, cellSize * 5, cellSize * 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 3, cellSize * 3);
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(x + cellSize * 1.5, y + cellSize * 1.5, cellSize * 2, cellSize * 2);
    };

    drawFinder(qrStart, qrStart - 40);
    drawFinder(qrStart + (cells - 5) * cellSize, qrStart - 40);
    drawFinder(qrStart, qrStart - 40 + (cells - 5) * cellSize);

    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (
          (r < 6 && c < 6) ||
          (r < 6 && c > cells - 7) ||
          (r > cells - 7 && c < 6)
        ) {
          continue;
        }
        if ((r * 11 + c * 7) % 3 === 0 || (r + c) % 2 === 0) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(qrStart + c * cellSize, qrStart - 40 + r * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('DEMO ONLY Â· NO PAYMENT', 256, 590);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText('DEMO ONLY · NOT A PAYMENT CODE', 256, 630);
  } else if (state === 'PAYMENT_SUCCESS') {
    ctx.fillStyle = '#059669';
    ctx.font = '900 36px "Segoe UI", sans-serif';
    ctx.fillText('DEMO CHECKOUT COMPLETE', 256, 220);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(256, 320, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText('âœ“', 256, 342);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText('DEMO CHECKOUT CONFIRMED', 256, 440);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('NO PAYMENT OR SALE RECORDED', 256, 480);
    ctx.fillText('SIMULATED CONFIRMATION ONLY', 256, 510);

    ctx.fillStyle = '#059669';
    ctx.font = '900 24px "Segoe UI", sans-serif';
    ctx.fillText('EXIT TURNSTILES UNLOCKED', 256, 590);
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('THANK YOU FOR SHOPPING AT GROCERAI!', 256, 625);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

