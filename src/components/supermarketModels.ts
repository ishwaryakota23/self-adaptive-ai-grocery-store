import * as THREE from 'three';
import {
  createPackageBoxTexture,
  createCylinderLabelTexture,
  createAisleSignTexture,
  createKioskScreenTexture
} from './supermarketTextures';

/**
 * Supermarket 3D Models Builder
 * Constructs realistic grocery shelves, packaged items, shopping carts, kiosks, coolers, and human shoppers.
 */

// Materials Cache for high performance
export const MATS = {
  shelfMetal: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.2 }),
  shelfPriceRail: new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 }),
  stainlessSteel: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.85 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 }),
  coolerFrame: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.7 }),
  coolerGlass: new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.85,
    ior: 1.5
  }),
  woodAccent: new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6, metalness: 0.05 }),
  ceilingTruss: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.4 }),
  ductPipe: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.75 })
};

/**
 * 1. Realistic Gondola Shelving Unit with Stocked Packaged Groceries
 */
export function buildSupermarketGondola(
  x: number,
  z: number,
  aisleNumber: string,
  department: string,
  categoryItems: string
): THREE.Group {
  const gondola = new THREE.Group();
  gondola.position.set(x, 0, z);

  const length = 9.0;
  const height = 2.4;
  const depth = 1.1;

  // Base Kickplate
  const kickplate = new THREE.Mesh(
    new THREE.BoxGeometry(depth, 0.2, length),
    MATS.darkMetal
  );
  kickplate.position.y = 0.1;
  gondola.add(kickplate);

  // Center Backing Board (Pegboard/solid divider)
  const backBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, height - 0.2, length),
    MATS.shelfMetal
  );
  backBoard.position.y = height / 2 + 0.1;
  backBoard.castShadow = true;
  gondola.add(backBoard);

  // Upright Vertical Slotted Columns
  for (let cz = -length / 2; cz <= length / 2; cz += length / 3) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, height, 0.08),
      MATS.stainlessSteel
    );
    post.position.set(0, height / 2, cz);
    gondola.add(post);
  }

  // Pre-generate packaging textures
  const textures = [
    createPackageBoxTexture('Nature Fresh', 'Chakki Atta', '5 KG', '#f59e0b', '#b45309', 'Staples'),
    createPackageBoxTexture('Tata Salt', 'Vacuum Salt', '1 KG', '#0284c7', '#0369a1', 'Pantry'),
    createPackageBoxTexture('Barilla', 'Organic Penne', '500 G', '#eab308', '#ca8a04', 'Pasta'),
    createPackageBoxTexture('Kellogg’s', 'Whole Wheat', '750 G', '#dc2626', '#991b1b', 'Breakfast'),
    createPackageBoxTexture('Daawat', 'Basmati Rice', '5 KG', '#10b981', '#047857', 'Grains'),
    createPackageBoxTexture('Quaker', 'Rolled Oats', '1 KG', '#3b82f6', '#1d4ed8', 'Cereal')
  ];

  const canTextures = [
    createCylinderLabelTexture('Napoli', 'Diced Tomatoes', '400 G', '#dc2626', '#ffffff'),
    createCylinderLabelTexture('Figaro', 'Pure Olive Oil', '1 L', '#15803d', '#ffffff'),
    createCylinderLabelTexture('Amul', 'Pure Ghee Tin', '1 L', '#d97706', '#ffffff')
  ];

  // 4 Shelving Tiers on each side
  const shelfHeights = [0.4, 0.95, 1.5, 2.05];

  shelfHeights.forEach((shelfY, tierIdx) => {
    // Left & Right Shelves
    [-0.38, 0.38].forEach((sideX) => {
      // Shelf Metal Plank
      const shelfPlank = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.04, length),
        MATS.shelfMetal
      );
      shelfPlank.position.set(sideX, shelfY, 0);
      shelfPlank.receiveShadow = true;
      gondola.add(shelfPlank);

      // Emerald Price Tag Rail
      const railX = sideX > 0 ? sideX + 0.35 : sideX - 0.35;
      const priceRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.05, length),
        MATS.shelfPriceRail
      );
      priceRail.position.set(railX, shelfY, 0);
      gondola.add(priceRail);

      // Populate shelf with organized rows of grocery items
      const isCansTier = tierIdx === 1 && sideX < 0;

      if (isCansTier) {
        // Canned food row
        for (let pz = -length / 2 + 0.4; pz <= length / 2 - 0.4; pz += 0.35) {
          const canTex = canTextures[Math.abs(Math.floor((pz * 3) % canTextures.length))];
          const canMat = new THREE.MeshStandardMaterial({
            map: canTex,
            roughness: 0.3,
            metalness: 0.4
          });
          const can = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.11, 0.3, 16),
            canMat
          );
          can.position.set(sideX, shelfY + 0.17, pz);
          can.castShadow = true;
          gondola.add(can);
        }
      } else {
        // Boxed items row
        for (let pz = -length / 2 + 0.4; pz <= length / 2 - 0.4; pz += 0.42) {
          const texIdx = Math.abs(Math.floor((pz * 5 + tierIdx * 2) % textures.length));
          const boxMat = new THREE.MeshStandardMaterial({
            map: textures[texIdx],
            roughness: 0.4,
            metalness: 0.05
          });
          // Realistic product box dimensions
          const boxW = 0.22;
          const boxH = tierIdx === 0 ? 0.45 : 0.38; // bottom shelves have bigger 5kg bags/boxes
          const boxD = 0.32;

          const box = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxD), boxMat);
          box.position.set(sideX, shelfY + boxH / 2 + 0.02, pz);
          box.castShadow = true;
          gondola.add(box);
        }
      }
    });
  });

  // Hanging Department Sign
  const signTex = createAisleSignTexture(aisleNumber, department, categoryItems);
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.8),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  signMesh.position.set(0, height + 0.9, 0);

  // Metal hanging rods from ceiling
  const rodL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), MATS.stainlessSteel);
  rodL.position.set(0, height + 1.5, -0.8);
  const rodR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), MATS.stainlessSteel);
  rodR.position.set(0, height + 1.5, 0.8);

  gondola.add(signMesh, rodL, rodR);

  return gondola;
}

/**
 * 2. Refrigerated Reach-In Dairy / Beverage Cooler Wall
 */
export function buildRefrigeratedCoolerWall(x: number, z: number, length = 12.0): THREE.Group {
  const wallGroup = new THREE.Group();
  wallGroup.position.set(x, 0, z);

  const coolerHeight = 3.0;
  const coolerDepth = 1.0;

  // Main Cabinet Body
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(coolerDepth, coolerHeight, length),
    MATS.coolerFrame
  );
  cabinet.position.set(0, coolerHeight / 2, 0);
  wallGroup.add(cabinet);

  // Illuminated Header Banner
  const headerTex = createAisleSignTexture('CHILLED', 'Farm Fresh Dairy & Milks', 'Organic Milk • Greek Yogurt • Artisan Cheese');
  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95 * length, 0.4),
    new THREE.MeshBasicMaterial({ map: headerTex })
  );
  header.rotation.y = -Math.PI / 2;
  header.position.set(-coolerDepth / 2 - 0.01, coolerHeight - 0.25, 0);
  wallGroup.add(header);

  // Interior Shelves & Internal Warm LED Lighting
  for (let sy = 0.5; sy <= 2.4; sy += 0.5) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(coolerDepth * 0.8, 0.03, length - 0.4),
      MATS.stainlessSteel
    );
    shelf.position.set(0.05, sy, 0);
    wallGroup.add(shelf);

    // Chilled bottle silhouettes inside cooler
    for (let bz = -length / 2 + 0.6; bz <= length / 2 - 0.6; bz += 0.28) {
      const bottleMat = new THREE.MeshStandardMaterial({
        color: (bz * 7) % 2 === 0 ? 0xffffff : 0x0284c7, // milk vs juices
        roughness: 0.1,
        metalness: 0.1
      });
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.32, 12),
        bottleMat
      );
      bottle.position.set(0.05, sy + 0.18, bz);
      wallGroup.add(bottle);
    }
  }

  // Glass Reach-In Doors with Chrome Handles
  const doorWidth = 1.2;
  const numDoors = Math.floor(length / doorWidth);
  for (let d = 0; d < numDoors; d++) {
    const doorZ = -length / 2 + (d + 0.5) * doorWidth;

    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, coolerHeight - 0.6, doorWidth - 0.04),
      MATS.coolerGlass
    );
    doorGlass.position.set(-coolerDepth / 2 - 0.02, (coolerHeight - 0.6) / 2 + 0.1, doorZ);
    wallGroup.add(doorGlass);

    // Vertical Chrome Handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.9, 12),
      MATS.stainlessSteel
    );
    handle.position.set(-coolerDepth / 2 - 0.08, coolerHeight / 2 - 0.1, doorZ + doorWidth * 0.35);
    wallGroup.add(handle);
  }

  // Internal Warm LED Glow light
  const coolerLight = new THREE.PointLight(0xe0f2fe, 1.8, 14);
  coolerLight.position.set(-0.2, 1.8, 0);
  wallGroup.add(coolerLight);

  return wallGroup;
}

/**
 * 3. Realistic Retail Self-Checkout Kiosk Pedestal
 */
export function buildPhysicalKiosk(
  x: number,
  z: number,
  kioskNumber: string,
  initialState: 'WELCOME' | 'SESSION_QR' | 'CHECKOUT_VERIFY' | 'KIOSK_PAYMENT_QR' | 'PAYMENT_SUCCESS' = 'WELCOME'
): { group: THREE.Group; updateState: (state: 'WELCOME' | 'SESSION_QR' | 'CHECKOUT_VERIFY' | 'KIOSK_PAYMENT_QR' | 'PAYMENT_SUCCESS') => void } {
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(x, 0, z);

  // Heavy Metal Base Plate
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.55, 0.1, 24),
    MATS.shelfMetal
  );
  base.position.y = 0.05;
  kioskGroup.add(base);

  // Brushed Aluminum Pedestal Pillar
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.25, 0.24),
    MATS.stainlessSteel
  );
  pillar.position.y = 0.72;
  kioskGroup.add(pillar);

  // Angled Display Head Housing
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.25, 0.14),
    MATS.shelfMetal
  );
  head.position.set(0, 1.55, 0);
  head.rotation.x = -0.25; // Ergonomic 15-degree retail tilt
  kioskGroup.add(head);

  // Screen Mesh
  const screenMat = new THREE.MeshBasicMaterial({
    map: createKioskScreenTexture(initialState)
  });
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 1.12),
    screenMat
  );
  screenMesh.position.set(0, 1.56, 0.08);
  screenMesh.rotation.x = -0.25;
  kioskGroup.add(screenMesh);

  // Optical Barcode Scanner Window below screen
  const scannerWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.14, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 })
  );
  scannerWindow.position.set(0, 1.1, 0.22);
  kioskGroup.add(scannerWindow);

  // Red targeting laser dot inside scanner glass
  const laserBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
  );
  laserBeam.position.set(0, 1.1, 0.265);
  kioskGroup.add(laserBeam);

  // Side Bagging & Packing Counter Tray
  const trayArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.55),
    MATS.stainlessSteel
  );
  trayArm.position.set(0.65, 0.85, 0.1);
  kioskGroup.add(trayArm);

  const trayPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.85),
    MATS.darkMetal
  );
  trayPost.position.set(0.65, 0.425, 0.1);
  kioskGroup.add(trayPost);

  // Interactive state updater
  const updateState = (newState: 'WELCOME' | 'SESSION_QR' | 'CHECKOUT_VERIFY' | 'KIOSK_PAYMENT_QR' | 'PAYMENT_SUCCESS') => {
    screenMat.map = createKioskScreenTexture(newState);
    screenMat.needsUpdate = true;
  };

  return { group: kioskGroup, updateState };
}

/**
 * 4. Realistic Supermarket Shopping Cart with Wireframe Basket
 */
export function buildShoppingCart(x: number, z: number, rotationY = 0): THREE.Group {
  const cart = new THREE.Group();
  cart.position.set(x, 0, z);
  cart.rotation.y = rotationY;

  // Tubular Steel Frame Chassis
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.08, 0.85),
    MATS.stainlessSteel
  );
  chassis.position.y = 0.22;
  cart.add(chassis);

  // 4 Caster Wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12);
  [
    [-0.26, 0.06, -0.36],
    [0.26, 0.06, -0.36],
    [-0.26, 0.06, 0.36],
    [0.26, 0.06, 0.36]
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    cart.add(wheel);
  });

  // Upright Basket Support Struts
  const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65), MATS.stainlessSteel);
  strutL.position.set(-0.28, 0.55, 0.35);
  const strutR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65), MATS.stainlessSteel);
  strutR.position.set(0.28, 0.55, 0.35);
  cart.add(strutL, strutR);

  // Wire Mesh Basket (Tapered)
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.2,
    wireframe: true
  });
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.52, 0.95),
    basketMat
  );
  basket.position.set(0, 0.72, 0);
  cart.add(basket);

  // Red Plastic Ergonomic Push Handlebar
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const handleBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.64),
    handleMat
  );
  handleBar.rotation.z = Math.PI / 2;
  handleBar.position.set(0, 0.95, 0.48);
  cart.add(handleBar);

  // Put 2 grocery items inside cart
  const item1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.35, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 })
  );
  item1.position.set(-0.15, 0.62, -0.15);
  const item2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.28, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
  );
  item2.position.set(0.12, 0.58, 0.1);
  cart.add(item1, item2);

  return cart;
}

/**
 * 5. Realistic Human Figures (Articulated Human Customers & Employees)
 * Uses accurate human anatomy proportions (~1.75m height): Head, Torso, Arms, Legs, Shoes.
 */
export function buildHumanFigure(
  options: {
    jacketColor: number;
    pantsColor: number;
    skinColor?: number;
    hairColor?: number;
    isHoldingPhone?: boolean;
    isStaff?: boolean;
  }
): { group: THREE.Group; updatePose: (walkPhase: number) => void } {
  const human = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor || 0xd4a373,
    roughness: 0.7
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairColor || 0x1c1917,
    roughness: 0.9
  });
  const clothesMat = new THREE.MeshStandardMaterial({
    color: options.jacketColor,
    roughness: 0.6
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: options.pantsColor,
    roughness: 0.7
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4
  });

  // Total Height: ~1.75m
  // 1. Head & Hair
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.62;

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), skinMat);
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7),
    hairMat
  );
  hairMesh.position.y = 0.02;
  hairMesh.rotation.x = -0.2;
  headGroup.add(headMesh, hairMesh);
  human.add(headGroup);

  // 2. Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08), skinMat);
  neck.position.y = 1.48;
  human.add(neck);

  // 3. Torso (Jacket / Shirt / Staff Apron)
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.55, 0.22),
    clothesMat
  );
  torso.position.y = 1.18;
  torso.castShadow = true;
  human.add(torso);

  // Staff Apron front badge if store employee
  if (options.isStaff) {
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    badge.position.set(0.1, 1.28, 0.115);
    human.add(badge);
  }

  // 4. Arms
  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.24, 1.4, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.55), clothesMat);
  leftArmMesh.position.y = -0.27;
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), skinMat);
  leftHand.position.y = -0.55;
  leftArmGroup.add(leftArmMesh, leftHand);
  human.add(leftArmGroup);

  // Right Arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.24, 1.4, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.55), clothesMat);
  rightArmMesh.position.y = -0.27;
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), skinMat);
  rightHand.position.y = -0.55;
  rightArmGroup.add(rightArmMesh, rightHand);

  // Smartphone held in right hand if enabled
  let phoneScreenMesh: THREE.Mesh | null = null;
  if (options.isHoldingPhone) {
    // Bend arm upward toward chest
    rightArmGroup.rotation.x = -0.7;
    rightArmGroup.rotation.z = -0.25;

    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.012),
      MATS.darkMetal
    );
    phone.position.set(0, -0.56, 0.04);
    phone.rotation.x = -0.4;

    phoneScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    phoneScreenMesh.position.z = 0.008;
    phone.add(phoneScreenMesh);
    rightArmGroup.add(phone);
  }
  human.add(rightArmGroup);

  // 5. Legs
  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.1, 0.88, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.82), pantsMat);
  leftLegMesh.position.y = -0.41;
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.22), shoeMat);
  leftShoe.position.set(0, -0.84, 0.05);
  leftLegGroup.add(leftLegMesh, leftShoe);
  human.add(leftLegGroup);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.1, 0.88, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.82), pantsMat);
  rightLegMesh.position.y = -0.41;
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.22), shoeMat);
  rightShoe.position.set(0, -0.84, 0.05);
  rightLegGroup.add(rightLegMesh, rightShoe);
  human.add(rightLegGroup);

  // Pose update for subtle natural idle/walking gestures
  const updatePose = (walkPhase: number) => {
    // Gentle natural walking / idle swing
    leftLegGroup.rotation.x = Math.sin(walkPhase) * 0.28;
    rightLegGroup.rotation.x = -Math.sin(walkPhase) * 0.28;

    if (!options.isHoldingPhone) {
      rightArmGroup.rotation.x = Math.sin(walkPhase) * 0.25;
    }
    leftArmGroup.rotation.x = -Math.sin(walkPhase) * 0.25;

    // Subtle breathing / head bob
    headGroup.position.y = 1.62 + Math.sin(walkPhase * 2) * 0.015;
  };

  return { group: human, updatePose };
}
