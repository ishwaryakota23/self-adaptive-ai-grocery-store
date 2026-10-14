import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createSupermarketFloorTexture,
  createPackageBoxTexture
} from './supermarketTextures';
import {
  MATS,
  buildSupermarketGondola,
  buildRefrigeratedCoolerWall,
  buildPhysicalKiosk,
  buildShoppingCart
} from './supermarketModels';

export type StageId = 1 | 2 | 3 | 4 | 5;
export type AgentViewMode = 'NORMAL' | 'SECURITY' | 'STORE' | 'CUSTOMER' | 'HINDSIGHT';

interface Store3DCanvasProps {
  currentStage: StageId;
  viewMode: AgentViewMode;
  onStageChange?: (stage: StageId) => void;
  isAutoTour?: boolean;
  onKioskInteract?: () => void;
  onIntroComplete?: () => void;
}

// Cinematic Camera Waypoints: Physically believable eye-level supermarket perspectives
const CAMERA_WAYPOINTS: Record<
  StageId | 'OVERVIEW',
  { position: THREE.Vector3; lookAt: THREE.Vector3 }
> = {
  1: {
    // 1. ENTRY: Approaching Storefront Automatic Sliding Doors with Grand Illuminated Marquee
    position: new THREE.Vector3(0, 2.1, 18.2),
    lookAt: new THREE.Vector3(0, 1.6, 9.5)
  },
  2: {
    // 2. KIOSK 01: Stepping directly up to the physical retail kiosk terminal
    position: new THREE.Vector3(-5.0, 1.7, 7.6),
    lookAt: new THREE.Vector3(-6.2, 1.45, 5.8)
  },
  3: {
    // 3. IN-AISLE: Eye-level perspective in Aisle 02 with Cart & Shelves
    position: new THREE.Vector3(2.4, 1.85, 3.8),
    lookAt: new THREE.Vector3(2.4, 1.4, -2.5)
  },
  4: {
    // 4. RETURN TO SAME KIOSK: Focused on Kiosk 01's bagging deck & barcode verification
    position: new THREE.Vector3(-5.2, 1.6, 7.2),
    lookAt: new THREE.Vector3(-6.2, 1.35, 5.8)
  },
  5: {
    // 5. DEMO CHECKOUT & EXIT: Kiosk 01 displaying the demo QR and exit turnstiles
    position: new THREE.Vector3(-4.8, 1.68, 7.5),
    lookAt: new THREE.Vector3(-6.2, 1.48, 5.8)
  },
  OVERVIEW: {
    // Architectural Wide Angle of the Whole Living Supermarket (Store Digital Twin)
    position: new THREE.Vector3(0, 16.5, 22.0),
    lookAt: new THREE.Vector3(0, 1.2, 2.0)
  }
};

export const Store3DCanvas: React.FC<Store3DCanvasProps> = ({
  currentStage,
  viewMode,
  onStageChange,
  isAutoTour = false,
  onKioskInteract,
  onIntroComplete
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameId = useRef<number | null>(null);

  // Interaction State
  const [isInteracting, setIsInteracting] = useState(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Animated Entities
  const doorLRef = useRef<THREE.Mesh | null>(null);
  const doorRRef = useRef<THREE.Mesh | null>(null);
  const exitTurnstileLRef = useRef<THREE.Mesh | null>(null);
  const exitTurnstileRRef = useRef<THREE.Mesh | null>(null);
  const kiosk01Updater = useRef<((state: any) => void) | null>(null);

  // Cart & Inspection
  const protagonistCartRef = useRef<THREE.Group | null>(null);
  const inspectedItemRef = useRef<THREE.Group | null>(null);
  const barcodeLaserRef = useRef<THREE.Mesh | null>(null);
  const jarvisOrbRef = useRef<THREE.Mesh | null>(null);

  // Multi-Agent Visual Overlay Groups
  const securityOverlayRef = useRef<THREE.Group | null>(null);
  const storeOverlayRef = useRef<THREE.Group | null>(null);
  const customerOverlayRef = useRef<THREE.Line | null>(null);
  const hindsightOverlayRef = useRef<THREE.Group | null>(null);

  // Camera targets: Starts at high-angle STORE DIGITAL TWIN overview
  const currentCamPos = useRef<THREE.Vector3>(CAMERA_WAYPOINTS.OVERVIEW.position.clone());
  const targetCamPos = useRef<THREE.Vector3>(CAMERA_WAYPOINTS.OVERVIEW.position.clone());
  const currentLookAt = useRef<THREE.Vector3>(CAMERA_WAYPOINTS.OVERVIEW.lookAt.clone());
  const targetLookAt = useRef<THREE.Vector3>(CAMERA_WAYPOINTS.OVERVIEW.lookAt.clone());
  const isIntroDescending = useRef(true);

  // Mouse Orbit Dragging
  const isPointerDown = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });

  // Sync camera waypoint with currentStage
  useEffect(() => {
    if (isIntroDescending.current && currentStage === 1) return;

    const waypoint = CAMERA_WAYPOINTS[currentStage] || CAMERA_WAYPOINTS[1];
    targetCamPos.current.copy(waypoint.position);
    targetLookAt.current.copy(waypoint.lookAt);

    // Sync physical Kiosk 01 screen state based on customer stage
    if (kiosk01Updater.current) {
      if (currentStage === 1) {
        kiosk01Updater.current('WELCOME');
      } else if (currentStage === 2) {
        kiosk01Updater.current('SESSION_QR');
      } else if (currentStage === 3) {
        kiosk01Updater.current('SESSION_QR');
      } else if (currentStage === 4) {
        kiosk01Updater.current('CHECKOUT_VERIFY');
      } else if (currentStage === 5) {
        kiosk01Updater.current('KIOSK_PAYMENT_QR');
        const paymentTimer = setTimeout(() => {
          if (kiosk01Updater.current) {
            kiosk01Updater.current('PAYMENT_SUCCESS');
          }
        }, 2200);
        return () => clearTimeout(paymentTimer);
      }
    }
  }, [currentStage]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c131f); // Modern architectural twilight / commercial interior
    scene.fog = new THREE.FogExp2(0x0c131f, 0.005); // Atmospheric depth
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    camera.position.copy(currentCamPos.current);
    camera.lookAt(currentLookAt.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute(
      'aria-label',
      'Realistic 3D GrocerAI Supermarket Environment. Experience the customer journey through aisles, kiosks, and checkout.'
    );
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // =========================================================================
    // 2. LIGHTING: Authentic Warm Supermarket Commercial Illumination (3200K)
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.65); // Warm ambient light with natural shadow contrast
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xfffaed, 1.8);
    mainSun.position.set(8, 22, 14);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.bias = -0.0001;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 45;
    mainSun.shadow.camera.left = -20;
    mainSun.shadow.camera.right = 20;
    mainSun.shadow.camera.top = 20;
    mainSun.shadow.camera.bottom = -20;
    scene.add(mainSun);

    // Architectural Linear Ceiling LED Downlights (Warm 3200K with glowing diffusers)
    const createLinearTrofferLight = (x: number, y: number, z: number) => {
      const troffer = new THREE.PointLight(0xfff7ed, 1.3, 16);
      troffer.position.set(x, y - 0.1, z);
      scene.add(troffer);

      // Diffuser strip
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.04, 3.8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      strip.position.set(x, y, z);
      scene.add(strip);
    };

    [-6, -2, 2, 6].forEach((tx) => {
      [12, 4, -4, -12].forEach((tz) => {
        createLinearTrofferLight(tx, 5.75, tz);
      });
    });

    // =========================================================================
    // 3. ARCHITECTURE: Terrazzo Floor, Enclosed Acoustic Ceiling, Perimeter Walls
    // =========================================================================
    // Large-format polished porcelain / terrazzo floor tiles
    const floorTexture = createSupermarketFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(40, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.12,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Architectural Dark Enclosed Industrial Ceiling (Solves cartoonish floating void!)
    const ceilingHeight = 5.8;
    const ceilingGeo = new THREE.PlaneGeometry(40, 48);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ceilingHeight, 2);
    scene.add(ceiling);

    // Exposed Architectural Ceiling Trusses & Silver HVAC Ducts
    for (let tz = -18; tz <= 18; tz += 6) {
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(38, 0.25, 0.25),
        MATS.ceilingTruss
      );
      truss.position.set(0, ceilingHeight - 0.15, tz);
      scene.add(truss);
    }

    // Cylindrical HVAC ventilation pipes running length of store
    [-7, 7].forEach((pipeX) => {
      const duct = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 44, 16),
        MATS.ductPipe
      );
      duct.rotation.x = Math.PI / 2;
      duct.position.set(pipeX, ceilingHeight - 0.45, 2);
      scene.add(duct);
    });

    // Rear Store Perimeter Wall with Warm Light Oak Vertical Slats
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(38, ceilingHeight),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
    );
    backWall.position.set(0, ceilingHeight / 2, -18);
    scene.add(backWall);

    for (let sx = -18; sx <= 18; sx += 1.8) {
      const woodSlat = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, ceilingHeight, 0.08),
        MATS.woodAccent
      );
      woodSlat.position.set(sx, ceilingHeight / 2, -17.9);
      scene.add(woodSlat);
    }

    // Right Perimeter Architectural Wall with Oak Acoustic Slats
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(46, ceilingHeight),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 })
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(19, ceilingHeight / 2, 2);
    scene.add(rightWall);

    for (let sz = -18; sz <= 18; sz += 2.2) {
      const rightSlat = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, ceilingHeight, 0.2),
        MATS.woodAccent
      );
      rightSlat.position.set(18.9, ceilingHeight / 2, sz);
      scene.add(rightSlat);
    }

    // Left Perimeter Wall (backboard behind refrigerated coolers)
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(46, ceilingHeight),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-19, ceilingHeight / 2, 2);
    scene.add(leftWall);

    // =========================================================================
    // 4. STOREFRONT ENTRANCE & AUTOMATIC SLIDING GLASS DOORS (Stage 1)
    // =========================================================================
    const storefrontGroup = new THREE.Group();
    storefrontGroup.position.set(0, 0, 15);

    // Sturdy Storefront Frame Pillars
    const framePillarL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.4), MATS.stainlessSteel);
    framePillarL.position.set(-2.4, 2.2, 0);
    const framePillarR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.4), MATS.stainlessSteel);
    framePillarR.position.set(2.4, 2.2, 0);

    const storefrontLintel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 0.4), MATS.stainlessSteel);
    storefrontLintel.position.set(0, 4.2, 0);

    // High-Resolution Illuminated Architectural GrocerAI Entrance Marquee
    const entranceBannerCanvas = document.createElement('canvas');
    entranceBannerCanvas.width = 1200;
    entranceBannerCanvas.height = 320;
    const ebCtx = entranceBannerCanvas.getContext('2d')!;

    // Deep forest emerald satin gradient
    const ebGrad = ebCtx.createLinearGradient(0, 0, 0, 320);
    ebGrad.addColorStop(0, '#064e3b');
    ebGrad.addColorStop(1, '#022c22');
    ebCtx.fillStyle = ebGrad;
    ebCtx.fillRect(0, 0, 1200, 320);

    // Gold/amber metallic outer framing inlay
    ebCtx.strokeStyle = '#f59e0b';
    ebCtx.lineWidth = 10;
    ebCtx.strokeRect(12, 12, 1176, 296);

    // Inner glowing mint border
    ebCtx.strokeStyle = '#34d399';
    ebCtx.lineWidth = 3;
    ebCtx.strokeRect(22, 22, 1156, 276);

    // Status indicator dot
    ebCtx.fillStyle = '#10b981';
    ebCtx.beginPath();
    ebCtx.arc(380, 105, 12, 0, Math.PI * 2);
    ebCtx.fill();

    // GrocerAI Brand Name
    ebCtx.fillStyle = '#ffffff';
    ebCtx.font = '900 78px "Segoe UI", Inter, sans-serif';
    ebCtx.textAlign = 'center';
    ebCtx.fillText('GROCERAI', 600, 128);

    // Branch tag
    ebCtx.fillStyle = '#a7f3d0';
    ebCtx.font = 'bold 28px "Segoe UI", monospace';
    ebCtx.fillText('AUTONOMOUS SUPERMARKET • BRANCH #104', 600, 195);

    // Capabilities subtitle
    ebCtx.fillStyle = '#cbd5e1';
    ebCtx.font = '600 20px "Segoe UI", sans-serif';
    ebCtx.fillText('PRE-PACKAGED RETAIL OS • INSTANT SKU VERIFICATION • FRICTIONLESS EXIT', 600, 248);

    const ebTex = new THREE.CanvasTexture(entranceBannerCanvas);
    ebTex.needsUpdate = true;

    // Physical 3D Signboard Housing Box
    const signHousing = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 1.4, 0.25),
      MATS.darkMetal
    );
    signHousing.position.set(0, 4.8, 0.12);

    const entranceBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 1.3),
      new THREE.MeshStandardMaterial({
        map: ebTex,
        roughness: 0.2,
        metalness: 0.15,
        emissive: 0x064e3b,
        emissiveIntensity: 0.28
      })
    );
    entranceBanner.position.set(0, 4.8, 0.26);

    // Clear Blue Glass Sliding Doors
    const doorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.45,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.5
    });

    // Flanking Glass Curtain Facade Panels
    [-8.5, 8.5].forEach((fx) => {
      const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.4), doorGlassMat);
      windowGlass.position.set(fx, 2.2, 0);
      storefrontGroup.add(windowGlass);
    });

    const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.8, 0.06), doorGlassMat);
    doorL.position.set(-0.9, 1.9, 0);
    doorLRef.current = doorL;

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.8, 0.06), doorGlassMat);
    doorR.position.set(0.9, 1.9, 0);
    doorRRef.current = doorR;

    // Marquee downward spotlights illuminating entrance doors
    const marqueeSpot = new THREE.SpotLight(0xfffbeb, 2.2, 12, Math.PI / 4, 0.4);
    marqueeSpot.position.set(0, 4.6, 1.2);
    marqueeSpot.target.position.set(0, 0, 0);
    storefrontGroup.add(marqueeSpot, marqueeSpot.target);

    // Commercial Charcoal Entrance Walk-in Mat
    const entranceMat = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 4.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    entranceMat.rotation.x = -Math.PI / 2;
    entranceMat.position.set(0, 0.02, 1.6);

    storefrontGroup.add(framePillarL, framePillarR, storefrontLintel, signHousing, entranceBanner, doorL, doorR, entranceMat);
    scene.add(storefrontGroup);

    // Digital Twin Opening Sequence:
    // After 900ms viewing the overhead Digital Twin, begin smooth descent towards Stage 1 entrance
    const introDescentTimer = setTimeout(() => {
      targetCamPos.current.copy(CAMERA_WAYPOINTS[1].position);
      targetLookAt.current.copy(CAMERA_WAYPOINTS[1].lookAt);
    }, 900);

    // =========================================================================
    // 5. PHYSICAL KIOSK FLEET (Kiosk 01, Kiosk 02, Kiosk 03 - Stage 2 & Stage 4)
    // =========================================================================
    const k1 = buildPhysicalKiosk(-6.2, 5.8, '01', 'WELCOME');
    kiosk01Updater.current = k1.updateState;

    const k2 = buildPhysicalKiosk(-4.4, 5.8, '02', 'WELCOME');
    const k3 = buildPhysicalKiosk(-2.6, 5.8, '03', 'WELCOME');

    scene.add(k1.group, k2.group, k3.group);

    // =========================================================================
    // 6. GROCERY AISLES & STOCKED PACKAGED PRODUCTS (Aisles 01, 02, 03 - Stage 3)
    // =========================================================================
    const aisle01 = buildSupermarketGondola(-2.6, -3.5, '01', 'Artisan Pantry & Pastas', 'Italian Penne • Durum Wheat • Baking Flour');
    const aisle02 = buildSupermarketGondola(2.4, -3.5, '02', 'Cooking Oils, Ghee & Spices', 'Pure Mustard Oil • Extra Virgin Olive Oil • Sea Salt');
    const aisle03 = buildSupermarketGondola(7.4, -3.5, '03', 'Grains, Cereals & Superfoods', 'Whole Grain Oats • Chakki Atta 5kg • Basmati Rice 5kg');
    scene.add(aisle01, aisle02, aisle03);

    // Left Perimeter Wall: Refrigerated Dairy & Chilled Beverage Cooler Wall
    const coolerWall = buildRefrigeratedCoolerWall(-14.0, -2.0, 16.0);
    scene.add(coolerWall);

    // =========================================================================
    // 7. CHECKOUT VERIFICATION ARCH & EXIT TURNSTILES (Stage 5)
    // =========================================================================
    const checkoutArea = new THREE.Group();
    checkoutArea.position.set(5.8, 0, 7.5);

    // Overhead Optical CV Verification Archway
    const archPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.8, 0.35), MATS.stainlessSteel);
    archPillarL.position.set(-1.8, 1.9, 0);
    const archPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.8, 0.35), MATS.stainlessSteel);
    archPillarR.position.set(1.8, 1.9, 0);
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.35, 0.35), MATS.stainlessSteel);
    archTop.position.set(0, 3.8, 0);

    // Downward Overhead Optical CV Camera housing
    const cameraHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.3, 16),
      MATS.darkMetal
    );
    cameraHousing.position.set(0, 3.6, 0);
    const cameraLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    cameraLens.position.set(0, 3.42, 0);
    checkoutArea.add(archPillarL, archPillarR, archTop, cameraHousing, cameraLens);

    // Exit Turnstiles
    const turnstileL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.05), doorGlassMat);
    turnstileL.position.set(-0.7, 0.75, 1.8);
    exitTurnstileLRef.current = turnstileL;

    const turnstileR = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.05), doorGlassMat);
    turnstileR.position.set(0.7, 0.75, 1.8);
    exitTurnstileRRef.current = turnstileR;

    checkoutArea.add(turnstileL, turnstileR);
    scene.add(checkoutArea);

    // =========================================================================
    // 8. SHOPPER CART (First-Person Perspective Shopper Journey)
    // =========================================================================
    const proCart = buildShoppingCart(-1.6, 12.0, 0);
    protagonistCartRef.current = proCart;
    scene.add(proCart);

    // =========================================================================
    // 9. STAGE 4 PRODUCT INSPECTION: Realistic Barcode Laser & SKU Bounding Box
    // =========================================================================
    const inspectedPack = new THREE.Group();
    inspectedPack.position.set(-5.8, 1.45, 5.75); // On Kiosk 01's bagging deck
    inspectedItemRef.current = inspectedPack;

    // Tata Salt 1kg Packaged Box
    const saltTex = createPackageBoxTexture('Tata Salt', 'Vacuum Evaporated', '1 KG', '#0284c7', '#0369a1', 'Pantry');
    const saltBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.45, 0.22),
      new THREE.MeshStandardMaterial({ map: saltTex, roughness: 0.3 })
    );
    inspectedPack.add(saltBox);

    // Subtle Neon Green Optical CV Bounding Box
    const bboxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.36, 0.5, 0.26));
    const bboxLine = new THREE.LineSegments(
      bboxEdges,
      new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 })
    );
    inspectedPack.add(bboxLine);

    // Red Barcode Scanner Laser Line
    const laserMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.012),
      new THREE.MeshBasicMaterial({ color: 0xff0033, side: THREE.DoubleSide })
    );
    laserMesh.position.set(0, 0, 0.12);
    barcodeLaserRef.current = laserMesh;
    inspectedPack.add(laserMesh);

    scene.add(inspectedPack);

    // Floating Customer JARVIS Orb (Stage 3 in-aisle)
    const orbGeo = new THREE.SphereGeometry(0.08, 32, 32);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const jarvisOrb = new THREE.Mesh(orbGeo, orbMat);
    jarvisOrb.position.set(1.8, 1.85, 3.2);
    jarvisOrbRef.current = jarvisOrb;
    scene.add(jarvisOrb);

    // =========================================================================
    // 10. MULTI-AGENT INVISIBLE INTELLIGENCE OVERLAYS (Toggled via Lens)
    // =========================================================================
    // Security Agent: Subtle overhead CCTV optical frustum cones
    const secGroup = new THREE.Group();
    [-6, 0, 6].forEach((cx) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 5.0, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
      );
      cone.position.set(cx, 5.0, 0);
      cone.rotation.x = Math.PI;
      secGroup.add(cone);
    });
    secGroup.visible = false;
    securityOverlayRef.current = secGroup;
    scene.add(secGroup);

    // Store Agent: Subtle shelf inventory green/amber stock heat indicators
    const storeGroup = new THREE.Group();
    [-2.6, 2.4, 7.4].forEach((gx) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 8.4),
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.22 })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(gx, 0.02, -3.5);
      storeGroup.add(strip);
    });
    storeGroup.visible = false;
    storeOverlayRef.current = storeGroup;
    scene.add(storeGroup);

    // Customer Agent: Glowing navigational waypoint trail on floor
    const customerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.03, 14),
      new THREE.Vector3(-5.5, 0.03, 6.5),
      new THREE.Vector3(1.8, 0.03, 3.5),
      new THREE.Vector3(1.8, 0.03, -3.0),
      new THREE.Vector3(-5.5, 0.03, 6.5),
      new THREE.Vector3(5.8, 0.03, 8.0)
    ]);
    const navGeo = new THREE.BufferGeometry().setFromPoints(customerCurve.getPoints(60));
    const navLine = new THREE.Line(
      navGeo,
      new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 3 })
    );
    navLine.visible = false;
    customerOverlayRef.current = navLine;
    scene.add(navLine);

    // Hindsight: Subtle neural data threads
    const hindGroup = new THREE.Group();
    for (let h = 0; h < 6; h++) {
      const p1 = new THREE.Vector3(-6 + h * 2.4, 2, -4);
      const p2 = new THREE.Vector3(0, 5.5, 10);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.45 });
      hindGroup.add(new THREE.Line(lineGeo, lineMat));
    }
    hindGroup.visible = false;
    hindsightOverlayRef.current = hindGroup;
    scene.add(hindGroup);

    // =========================================================================
    // 11. SMOOTH ANIMATION LOOP (60 FPS)
    // =========================================================================
    const startTime = performance.now();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;

      // 1. Smooth Camera LERP toward target waypoint
      currentCamPos.current.lerp(targetCamPos.current, 0.038);
      currentLookAt.current.lerp(targetLookAt.current, 0.038);
      camera.position.copy(currentCamPos.current);
      camera.lookAt(currentLookAt.current);

      // Check if initial descent reached entrance and GrocerAI board is in full view!
      if (
        isIntroDescending.current &&
        currentCamPos.current.distanceTo(CAMERA_WAYPOINTS[1].position) < 2.5
      ) {
        isIntroDescending.current = false;
        if (onIntroComplete) {
          onIntroComplete();
        }
      }

      // 2. Door Animations
      // Entrance Doors: Open smoothly during Stage 1 once board is reached
      if (doorLRef.current && doorRRef.current) {
        const doorOffset = currentStage === 1 && !isIntroDescending.current ? -1.35 : 0;
        doorLRef.current.position.x = THREE.MathUtils.lerp(doorLRef.current.position.x, -0.9 + doorOffset, 0.05);
        doorRRef.current.position.x = THREE.MathUtils.lerp(doorRRef.current.position.x, 0.9 - doorOffset, 0.05);
      }

      // Exit Turnstiles: Open smoothly during Stage 5
      if (exitTurnstileLRef.current && exitTurnstileRRef.current) {
        const turnOffset = currentStage === 5 ? -1.0 : 0;
        exitTurnstileLRef.current.position.x = THREE.MathUtils.lerp(
          exitTurnstileLRef.current.position.x,
          -0.7 + turnOffset,
          0.05
        );
        exitTurnstileRRef.current.position.x = THREE.MathUtils.lerp(
          exitTurnstileRRef.current.position.x,
          0.7 - turnOffset,
          0.05
        );
      }

      // 3. Dynamic Position of Shopping Cart based on Journey Stage
      if (protagonistCartRef.current) {
        let targetCartPos = new THREE.Vector3(-1.6, 0, 12.0);
        let targetCartRot = 0;

        if (currentStage === 1) {
          // Entrance: Cart ready as doors slide open
          targetCartPos = new THREE.Vector3(-1.6, 0, 12.0);
          targetCartRot = 0;
        } else if (currentStage === 2) {
          // Kiosk 01: Cart parked beside Kiosk 01
          targetCartPos = new THREE.Vector3(-4.8, 0, 6.8);
          targetCartRot = -0.35;
        } else if (currentStage === 3) {
          // In Aisle 02: Cart rolling down the aisle
          targetCartPos = new THREE.Vector3(2.4, 0, 1.2);
          targetCartRot = Math.PI;
        } else if (currentStage === 4) {
          // Return to same Kiosk 01: Cart beside bagging deck
          targetCartPos = new THREE.Vector3(-4.8, 0, 6.8);
          targetCartRot = -0.35;
        } else if (currentStage === 5) {
          // Payment at Kiosk & Exit: Cart rolling through unlocked turnstiles
          targetCartPos = new THREE.Vector3(4.8, 0, 8.5);
          targetCartRot = Math.PI / 4;
        }

        protagonistCartRef.current.position.lerp(targetCartPos, 0.05);
        protagonistCartRef.current.rotation.y = THREE.MathUtils.lerp(
          protagonistCartRef.current.rotation.y,
          targetCartRot,
          0.05
        );
      }

      // 5. Barcode Laser Sweep in Stage 4
      if (barcodeLaserRef.current) {
        if (currentStage === 4) {
          barcodeLaserRef.current.visible = true;
          barcodeLaserRef.current.position.y = Math.sin(elapsed * 4.5) * 0.18;
        } else {
          barcodeLaserRef.current.visible = false;
        }
      }

      // 6. Inspected Item Hover in Stage 4
      if (inspectedItemRef.current) {
        if (currentStage === 4) {
          inspectedItemRef.current.position.y = 1.45 + Math.sin(elapsed * 2.0) * 0.04;
          inspectedItemRef.current.rotation.y = Math.sin(elapsed * 0.8) * 0.15;
        } else {
          inspectedItemRef.current.position.y = 1.1;
        }
      }

      // 7. JARVIS Orb Pulse in Stage 3
      if (jarvisOrbRef.current) {
        if (currentStage === 3) {
          jarvisOrbRef.current.visible = true;
          const orbScale = 1.0 + Math.sin(elapsed * 5.0) * 0.15;
          jarvisOrbRef.current.scale.set(orbScale, orbScale, orbScale);
          jarvisOrbRef.current.rotation.y += 0.02;
        } else {
          jarvisOrbRef.current.visible = false;
        }
      }

      // 8. Lens Overlay Visibility
      if (securityOverlayRef.current) {
        securityOverlayRef.current.visible = viewMode === 'SECURITY';
      }
      if (storeOverlayRef.current) {
        storeOverlayRef.current.visible = viewMode === 'STORE';
      }
      if (customerOverlayRef.current) {
        customerOverlayRef.current.visible = viewMode === 'CUSTOMER' || currentStage === 3;
      }
      if (hindsightOverlayRef.current) {
        hindsightOverlayRef.current.visible = viewMode === 'HINDSIGHT';
        if (viewMode === 'HINDSIGHT') {
          hindsightOverlayRef.current.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Pointer Drag to freely orbit in 3D
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    prevPointer.current = { x: e.clientX, y: e.clientY };
    setIsInteracting(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current || !cameraRef.current) return;
    const dx = e.clientX - prevPointer.current.x;
    const dy = e.clientY - prevPointer.current.y;
    prevPointer.current = { x: e.clientX, y: e.clientY };

    targetCamPos.current.x += dx * 0.012;
    targetCamPos.current.y = Math.max(1.4, Math.min(22, targetCamPos.current.y - dy * 0.012));
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const zoomDelta = e.deltaY * 0.008;
    targetCamPos.current.z = Math.max(2.0, Math.min(26, targetCamPos.current.z + zoomDelta));
  };

  const resetToStage = () => {
    const waypoint = CAMERA_WAYPOINTS[currentStage] || CAMERA_WAYPOINTS[1];
    targetCamPos.current.copy(waypoint.position);
    targetLookAt.current.copy(waypoint.lookAt);
    setIsInteracting(false);
  };

  const showOverview = () => {
    const waypoint = CAMERA_WAYPOINTS.OVERVIEW;
    targetCamPos.current.copy(waypoint.position);
    targetLookAt.current.copy(waypoint.lookAt);
    setIsInteracting(true);
  };

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      style={{ cursor: isPointerDown.current ? 'grabbing' : 'grab' }}
    >
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating Spatial Camera Buttons */}
      <div className="absolute top-20 right-6 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={showOverview}
          className="px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white border border-slate-200 text-[11px] font-mono font-bold text-slate-800 backdrop-blur-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          title="Wide View of the Living Supermarket"
        >
          <span>🛰️</span>
          <span>STORE DIGITAL TWIN</span>
        </button>

        {isInteracting && (
          <button
            onClick={resetToStage}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] backdrop-blur-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>🎯</span>
            <span>BACK TO STAGE {currentStage}</span>
          </button>
        )}
      </div>
    </div>
  );
};
