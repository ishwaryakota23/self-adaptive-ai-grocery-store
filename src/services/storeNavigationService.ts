import { db } from './db';
import { Product, ShoppingMission, ShoppingMissionItem } from '../types';

export interface NavigationNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'entrance' | 'corridor' | 'crossing' | 'aisle_entry' | 'shelf_bay' | 'checkout';
  aisleId?: string;
  description: string;
}

export interface NavigationEdge {
  from: string;
  to: string;
  distanceMeters: number;
}

export interface StoreZone {
  id: string;
  name: string;
  aisle: string;
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
  entryNodeId: string;
  color: string;
  borderColor: string;
  iconName: string;
  description: string;
}

export interface ShelfDestination {
  productId: string;
  productName: string;
  aisle: string;
  shelfLocation: string;
  categoryName: string;
  zoneId: string;
  targetNodeId: string;
  coordinates: { x: number; y: number };
  imageUrl?: string;
  price?: number;
}

export interface RouteWaypoint {
  nodeId: string;
  name: string;
  x: number;
  y: number;
  instruction: string;
}

export interface CalculatedRoute {
  startNodeId: string;
  destinationNodeId: string;
  targetProduct?: Product;
  targetAisle?: string;
  targetShelf?: string;
  waypoints: RouteWaypoint[];
  pathD: string; // SVG path string
  totalDistanceMeters: number;
  estimatedWalkingSeconds: number;
  estimatedWalkingMinutesFormatted: string;
  turnByTurnInstructions: string[];
}

export interface MissionStop {
  stopNumber: number;
  itemId: string;
  productId: string;
  productName: string;
  aisle: string;
  shelfLocation: string;
  nodeId: string;
  coordinates: { x: number; y: number };
  isFound: boolean;
}

export interface MultiStopMissionRoute {
  missionId: string;
  missionName: string;
  stops: MissionStop[];
  currentStopIndex: number;
  currentStop?: MissionStop;
  nextStops: MissionStop[];
  activeLegRoute: CalculatedRoute;
  fullTourPathD: string;
  totalRemainingDistanceMeters: number;
  totalRemainingTimeFormatted: string;
  completedStopsCount: number;
  totalStopsCount: number;
}

// ============================================================================
// AUTHORITATIVE STORE ZONES CONFIGURATION (9 ZONES MATCHING CANVAS 760x460)
// ============================================================================

export const STORE_ZONES: StoreZone[] = [
  {
    id: 'zone-fruits',
    name: 'Fruits & Farm Fresh',
    aisle: 'Aisle 1',
    category: 'Produce',
    x: 120,
    y: 140,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-1',
    color: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/50',
    iconName: 'Apple',
    description: 'Farm-fresh tomatoes, organic garlic, and seasonal fruits'
  },
  {
    id: 'zone-veggies',
    name: 'Root & Staple Veggies',
    aisle: 'Aisle 2',
    category: 'Produce',
    x: 120,
    y: 240,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-2',
    color: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/50',
    iconName: 'Carrot',
    description: 'Nashik red onions, potatoes, ginger, and root tubers'
  },
  {
    id: 'zone-grains',
    name: 'Grains, Pasta & Oils',
    aisle: 'Aisle 3',
    category: 'Pantry',
    x: 260,
    y: 140,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-3',
    color: 'bg-amber-950/40',
    borderColor: 'border-amber-500/50',
    iconName: 'Wheat',
    description: 'Italian penne pasta, extra virgin olive oils, basmati rice'
  },
  {
    id: 'zone-dairy',
    name: 'Chilled Dairy & Plant Milks',
    aisle: 'Aisle 4',
    category: 'Dairy',
    x: 260,
    y: 240,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-4',
    color: 'bg-blue-950/40',
    borderColor: 'border-blue-500/50',
    iconName: 'Milk',
    description: 'Amul fresh paneer, taaza milk, curd, cheese blocks, Greek yogurt, tofu'
  },
  {
    id: 'zone-care',
    name: 'Superfoods & Wellness',
    aisle: 'Aisle 5',
    category: 'Wellness',
    x: 540,
    y: 240,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-5',
    color: 'bg-pink-950/40',
    borderColor: 'border-pink-500/50',
    iconName: 'Sparkles',
    description: 'Organic royal quinoa, health superfoods, chia seeds, hygiene essentials'
  },
  {
    id: 'zone-bakery',
    name: 'Bakery & Artisan Bread',
    aisle: 'Aisle 6',
    category: 'Bakery',
    x: 400,
    y: 140,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-6',
    color: 'bg-yellow-950/40',
    borderColor: 'border-yellow-500/50',
    iconName: 'Croissant',
    description: 'Whole wheat breads, sourdough loaves, fresh morning rolls'
  },
  {
    id: 'zone-snacks',
    name: 'Snacks & Biscuits',
    aisle: 'Aisle 7',
    category: 'Packaged',
    x: 400,
    y: 240,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-7',
    color: 'bg-purple-950/40',
    borderColor: 'border-purple-500/50',
    iconName: 'Cookie',
    description: 'Roasted nuts, artisan crackers, baked munchies (Physical stock)'
  },
  {
    id: 'zone-beverages',
    name: 'Beverages & Coffee',
    aisle: 'Aisle 8',
    category: 'Drinks',
    x: 540,
    y: 140,
    w: 100,
    h: 70,
    entryNodeId: 'node-aisle-8',
    color: 'bg-cyan-950/40',
    borderColor: 'border-cyan-500/50',
    iconName: 'Coffee',
    description: 'Artisan tea, cold brew coffee, natural fruit juices (Physical stock)'
  },
  {
    id: 'zone-checkout',
    name: 'Checkout Counters 1–4',
    aisle: 'Checkout',
    category: 'Service',
    x: 200,
    y: 360,
    w: 360,
    h: 60,
    entryNodeId: 'node-checkout',
    color: 'bg-emerald-950/30',
    borderColor: 'border-emerald-500/60',
    iconName: 'CreditCard',
    description: 'Optical computer vision counters, express scan, automated exit'
  }
];

// ============================================================================
// TOPOLOGICAL NAVIGATION GRAPH NODES (760 x 460 Coordinate System)
// ============================================================================

export const NAVIGATION_NODES: Record<string, NavigationNode> = {
  // Store Entrance & Primary Foyer
  'node-entrance': {
    id: 'node-entrance',
    name: 'Store Entrance & Gates',
    x: 380,
    y: 430,
    type: 'entrance',
    description: 'Main automated glass security entry gates'
  },
  'node-lobby-center': {
    id: 'node-lobby-center',
    name: 'South Concourse Center',
    x: 380,
    y: 340,
    type: 'crossing',
    description: 'Central walkway junction south of central aisles'
  },
  'node-lobby-west': {
    id: 'node-lobby-west',
    name: 'South Concourse West',
    x: 240,
    y: 340,
    type: 'crossing',
    description: 'Walkway south of Grains & Dairy'
  },
  'node-lobby-far-west': {
    id: 'node-lobby-far-west',
    name: 'South Concourse Far West',
    x: 80,
    y: 340,
    type: 'crossing',
    description: 'Walkway south of Fresh Produce'
  },
  'node-lobby-east': {
    id: 'node-lobby-east',
    name: 'South Concourse East',
    x: 520,
    y: 340,
    type: 'crossing',
    description: 'Walkway south of Bakery & Snacks'
  },
  'node-lobby-far-east': {
    id: 'node-lobby-far-east',
    name: 'South Concourse Far East',
    x: 660,
    y: 340,
    type: 'crossing',
    description: 'Walkway south of Beverages & Wellness'
  },

  // Central Horizontal Promenade (Cross-aisle between row 1 & row 2)
  'node-mid-center': {
    id: 'node-mid-center',
    name: 'Central Crossing',
    x: 380,
    y: 225,
    type: 'crossing',
    description: 'Heart of the retail floor between Aisle 3/4 and 6/7'
  },
  'node-mid-west': {
    id: 'node-mid-west',
    name: 'Central-West Crossing',
    x: 240,
    y: 225,
    type: 'crossing',
    description: 'Junction between Produce and Dairy/Grains'
  },
  'node-mid-far-west': {
    id: 'node-mid-far-west',
    name: 'Produce Mid-Crossing',
    x: 80,
    y: 225,
    type: 'crossing',
    description: 'West perimeter walkway between Aisle 1 and Aisle 2'
  },
  'node-mid-east': {
    id: 'node-mid-east',
    name: 'Central-East Crossing',
    x: 520,
    y: 225,
    type: 'crossing',
    description: 'Junction between Bakery/Snacks and Wellness/Drinks'
  },
  'node-mid-far-east': {
    id: 'node-mid-far-east',
    name: 'East Perimeter Crossing',
    x: 660,
    y: 225,
    type: 'crossing',
    description: 'East wall walkway between Aisle 5 and Aisle 8'
  },

  // North Concourse (Top row walkway)
  'node-north-center': {
    id: 'node-north-center',
    name: 'North Promenade Center',
    x: 380,
    y: 90,
    type: 'crossing',
    description: 'Northern corridor between Grains and Bakery'
  },
  'node-north-west': {
    id: 'node-north-west',
    name: 'North-West Promenade',
    x: 240,
    y: 90,
    type: 'crossing',
    description: 'Northern corridor between Fruits and Grains'
  },
  'node-north-far-west': {
    id: 'node-north-far-west',
    name: 'North-West Corner',
    x: 80,
    y: 90,
    type: 'crossing',
    description: 'Corner near Fruits & Veg displays'
  },
  'node-north-east': {
    id: 'node-north-east',
    name: 'North-East Promenade',
    x: 520,
    y: 90,
    type: 'crossing',
    description: 'Northern corridor between Bakery and Beverages'
  },
  'node-north-far-east': {
    id: 'node-north-far-east',
    name: 'North-East Corner',
    x: 660,
    y: 90,
    type: 'crossing',
    description: 'Corner near Beverages and Chilled Dispensers'
  },

  // Aisle & Shelf Bay Waypoints (Exact destination pins)
  'node-aisle-1': {
    id: 'node-aisle-1',
    name: 'Aisle 1 - Fruits & Veg Entry',
    x: 170,
    y: 175,
    type: 'shelf_bay',
    aisleId: 'Aisle 1',
    description: 'Produce Bins 1–7 (Tomatoes, Garlic)'
  },
  'node-aisle-2': {
    id: 'node-aisle-2',
    name: 'Aisle 2 - Root Veggies Entry',
    x: 170,
    y: 275,
    type: 'shelf_bay',
    aisleId: 'Aisle 2',
    description: 'Root Vegetable Bins (Nashik Red Onions)'
  },
  'node-aisle-3': {
    id: 'node-aisle-3',
    name: 'Aisle 3 - Grains & Oils Entry',
    x: 310,
    y: 175,
    type: 'shelf_bay',
    aisleId: 'Aisle 3',
    description: 'Pantry Shelves A3/C1 (Borges Pasta, Figaro Olive Oil)'
  },
  'node-aisle-4': {
    id: 'node-aisle-4',
    name: 'Aisle 4 - Dairy Section Entry',
    x: 310,
    y: 275,
    type: 'shelf_bay',
    aisleId: 'Aisle 4',
    description: 'Dairy Refrigerated Bay B2/A1 (Amul Paneer, Milk, Cheese)'
  },
  'node-aisle-5': {
    id: 'node-aisle-5',
    name: 'Aisle 5 - Superfoods Entry',
    x: 590,
    y: 275,
    type: 'shelf_bay',
    aisleId: 'Aisle 5',
    description: 'Superfood Shelf C3 (Organic Royal Quinoa)'
  },
  'node-aisle-6': {
    id: 'node-aisle-6',
    name: 'Aisle 6 - Bakery Entry',
    x: 450,
    y: 175,
    type: 'shelf_bay',
    aisleId: 'Aisle 6',
    description: 'Bakery Rack 1 (Zero Maida Whole Wheat Bread)'
  },
  'node-aisle-7': {
    id: 'node-aisle-7',
    name: 'Aisle 7 - Snacks Entry',
    x: 450,
    y: 275,
    type: 'shelf_bay',
    aisleId: 'Aisle 7',
    description: 'Snack Racks & Crackers'
  },
  'node-aisle-8': {
    id: 'node-aisle-8',
    name: 'Aisle 8 - Beverages Entry',
    x: 590,
    y: 175,
    type: 'shelf_bay',
    aisleId: 'Aisle 8',
    description: 'Beverage Coolers & Coffee'
  },
  'node-checkout': {
    id: 'node-checkout',
    name: 'Checkout Counters 1–4',
    x: 380,
    y: 390,
    type: 'checkout',
    description: 'Computer Vision Optical Scanners & Exit Turnpike'
  }
};

// ============================================================================
// STORE CORRIDOR EDGES (SCALE: 1 px ≈ 0.08m)
// ============================================================================

const RAW_EDGES: Array<[string, string]> = [
  // Entrance into South Lobby
  ['node-entrance', 'node-lobby-center'],

  // South Horizontal Concourse
  ['node-lobby-far-west', 'node-lobby-west'],
  ['node-lobby-west', 'node-lobby-center'],
  ['node-lobby-center', 'node-lobby-east'],
  ['node-lobby-east', 'node-lobby-far-east'],

  // Checkout Access
  ['node-lobby-center', 'node-checkout'],
  ['node-lobby-west', 'node-checkout'],
  ['node-lobby-east', 'node-checkout'],

  // Vertical Corridors
  ['node-lobby-far-west', 'node-mid-far-west'],
  ['node-mid-far-west', 'node-north-far-west'],

  ['node-lobby-west', 'node-mid-west'],
  ['node-mid-west', 'node-north-west'],

  ['node-lobby-center', 'node-mid-center'],
  ['node-mid-center', 'node-north-center'],

  ['node-lobby-east', 'node-mid-east'],
  ['node-mid-east', 'node-north-east'],

  ['node-lobby-far-east', 'node-mid-far-east'],
  ['node-mid-far-east', 'node-north-far-east'],

  // Mid Cross-Aisle Promenade
  ['node-mid-far-west', 'node-mid-west'],
  ['node-mid-west', 'node-mid-center'],
  ['node-mid-center', 'node-mid-east'],
  ['node-mid-east', 'node-mid-far-east'],

  // North Concourse
  ['node-north-far-west', 'node-north-west'],
  ['node-north-west', 'node-north-center'],
  ['node-north-center', 'node-north-east'],
  ['node-north-east', 'node-north-far-east'],

  // Aisle Shelf Connections (Orthogonal branches into bays)
  ['node-mid-west', 'node-aisle-1'],
  ['node-north-west', 'node-aisle-1'],
  ['node-mid-west', 'node-aisle-2'],
  ['node-lobby-west', 'node-aisle-2'],

  ['node-mid-west', 'node-aisle-3'],
  ['node-mid-center', 'node-aisle-3'],
  ['node-north-west', 'node-aisle-3'],

  ['node-mid-west', 'node-aisle-4'],
  ['node-mid-center', 'node-aisle-4'],
  ['node-lobby-west', 'node-aisle-4'],

  ['node-mid-center', 'node-aisle-6'],
  ['node-north-center', 'node-aisle-6'],
  ['node-mid-east', 'node-aisle-6'],

  ['node-mid-center', 'node-aisle-7'],
  ['node-lobby-center', 'node-aisle-7'],
  ['node-mid-east', 'node-aisle-7'],

  ['node-mid-east', 'node-aisle-8'],
  ['node-north-east', 'node-aisle-8'],
  ['node-mid-far-east', 'node-aisle-8'],

  ['node-mid-east', 'node-aisle-5'],
  ['node-lobby-east', 'node-aisle-5'],
  ['node-mid-far-east', 'node-aisle-5'],
];

// Build bidirectional weighted adjacency list
const PIXEL_TO_METERS = 0.08;
const WALKING_SPEED_METERS_PER_SEC = 1.1; // ~66 meters/min (comfortable shopping pace)

export const ADJACENCY_LIST: Map<string, Array<{ to: string; distanceMeters: number }>> = new Map();

for (const [fromId, toId] of RAW_EDGES) {
  const nodeA = NAVIGATION_NODES[fromId];
  const nodeB = NAVIGATION_NODES[toId];
  if (!nodeA || !nodeB) continue;

  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  const pixelDist = Math.sqrt(dx * dx + dy * dy);
  const distanceMeters = Math.max(1.5, Math.round(pixelDist * PIXEL_TO_METERS * 10) / 10);

  if (!ADJACENCY_LIST.has(fromId)) ADJACENCY_LIST.set(fromId, []);
  if (!ADJACENCY_LIST.has(toId)) ADJACENCY_LIST.set(toId, []);

  ADJACENCY_LIST.get(fromId)!.push({ to: toId, distanceMeters });
  ADJACENCY_LIST.get(toId)!.push({ to: fromId, distanceMeters });
}

// ============================================================================
// EXACT PRODUCT-TO-SHELF COORDINATE OFFSET RESOLVER
// ============================================================================

export function resolveShelfDestination(product: Product): ShelfDestination {
  const aisleClean = (product.aisle || 'Aisle 4').trim();
  const matchedZone = STORE_ZONES.find(z => z.aisle.toLowerCase() === aisleClean.toLowerCase()) || STORE_ZONES[3]; // default Dairy
  
  // High-precision shelf coordinate offsets inside the zone
  let coordX = matchedZone.x + matchedZone.w / 2;
  let coordY = matchedZone.y + matchedZone.h / 2;

  const shelfLower = (product.shelf_location || '').toLowerCase();
  if (shelfLower.includes('shelf a1') || shelfLower.includes('bin 1')) {
    coordX = matchedZone.x + 25;
    coordY = matchedZone.y + 25;
  } else if (shelfLower.includes('shelf a2') || shelfLower.includes('bin 2')) {
    coordX = matchedZone.x + 25;
    coordY = matchedZone.y + 45;
  } else if (shelfLower.includes('shelf a3') || shelfLower.includes('bin 3')) {
    coordX = matchedZone.x + 25;
    coordY = matchedZone.y + 55;
  } else if (shelfLower.includes('shelf b1') || shelfLower.includes('bin 4')) {
    coordX = matchedZone.x + 50;
    coordY = matchedZone.y + 25;
  } else if (shelfLower.includes('shelf b2') || shelfLower.includes('bin 5')) {
    coordX = matchedZone.x + 50;
    coordY = matchedZone.y + 45; // exact paneer shelf
  } else if (shelfLower.includes('shelf c1') || shelfLower.includes('bin 7')) {
    coordX = matchedZone.x + 75;
    coordY = matchedZone.y + 25;
  } else if (shelfLower.includes('shelf c3')) {
    coordX = matchedZone.x + 75;
    coordY = matchedZone.y + 55;
  } else if (shelfLower.includes('shelf d1')) {
    coordX = matchedZone.x + 85;
    coordY = matchedZone.y + 35;
  } else if (shelfLower.includes('shelf d3')) {
    coordX = matchedZone.x + 85;
    coordY = matchedZone.y + 55;
  }

  return {
    productId: product.id,
    productName: product.name,
    aisle: product.aisle,
    shelfLocation: product.shelf_location || `${product.aisle} Shelf`,
    categoryName: product.category_name || matchedZone.category,
    zoneId: matchedZone.id,
    targetNodeId: matchedZone.entryNodeId,
    coordinates: { x: coordX, y: coordY },
    imageUrl: product.image_url,
    price: product.price
  };
}

// ============================================================================
// DETERMINISTIC SHORTEST-PATH ROUTE SOLVER (DIJKSTRA / BFS)
// ============================================================================

export class StoreNavigationService {
  private static instance: StoreNavigationService;
  private currentCustomerNodeId: string = 'node-entrance';

  private constructor() {}

  public static getInstance(): StoreNavigationService {
    if (!StoreNavigationService.instance) {
      StoreNavigationService.instance = new StoreNavigationService();
    }
    return StoreNavigationService.instance;
  }

  public getCurrentNodeId(): string {
    return this.currentCustomerNodeId;
  }

  public setCurrentNodeId(nodeId: string): void {
    if (NAVIGATION_NODES[nodeId]) {
      this.currentCustomerNodeId = nodeId;
    }
  }

  /**
   * Deterministic Dijkstra Pathfinding between any two waypoint nodes
   */
  public findShortestPath(startNodeId: string, targetNodeId: string): string[] {
    if (!NAVIGATION_NODES[startNodeId] || !NAVIGATION_NODES[targetNodeId]) {
      return ['node-entrance', 'node-lobby-center', 'node-aisle-4'];
    }

    if (startNodeId === targetNodeId) {
      return [startNodeId];
    }

    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited: Set<string> = new Set();

    for (const nodeId of Object.keys(NAVIGATION_NODES)) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let currentSmallest: string | null = null;
      let smallestDist = Infinity;
      for (const node of unvisited) {
        const dist = distances.get(node) ?? Infinity;
        if (dist < smallestDist) {
          smallestDist = dist;
          currentSmallest = node;
        }
      }

      if (!currentSmallest || smallestDist === Infinity) break;
      if (currentSmallest === targetNodeId) break;

      unvisited.delete(currentSmallest);

      const neighbors = ADJACENCY_LIST.get(currentSmallest) || [];
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.to)) continue;

        const alt = smallestDist + neighbor.distanceMeters;
        if (alt < (distances.get(neighbor.to) ?? Infinity)) {
          distances.set(neighbor.to, alt);
          previous.set(neighbor.to, currentSmallest);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let curr: string | null = targetNodeId;
    while (curr) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
      if (curr === startNodeId) {
        path.unshift(startNodeId);
        break;
      }
    }

    return path.length > 0 ? path : [startNodeId, targetNodeId];
  }

  /**
   * Convert an ordered sequence of node IDs into an SVG path string
   */
  public generateSvgPathD(nodeIds: string[], finalPoint?: { x: number; y: number }): string {
    if (nodeIds.length === 0) return '';
    const points: Array<{ x: number; y: number }> = nodeIds
      .map(id => NAVIGATION_NODES[id])
      .filter(Boolean)
      .map(n => ({ x: n.x, y: n.y }));

    if (finalPoint) {
      points.push(finalPoint);
    }

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    // Generate smooth SVG polyline with rounded turns
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  /**
   * Calculate dynamic route to a product from current customer position
   */
  public calculateRouteToProduct(
    product: Product,
    startNodeId = this.currentCustomerNodeId
  ): CalculatedRoute {
    const dest = resolveShelfDestination(product);
    const nodePath = this.findShortestPath(startNodeId, dest.targetNodeId);

    // Calculate real distances
    let totalDist = 0;
    for (let i = 0; i < nodePath.length - 1; i++) {
      const neighbors = ADJACENCY_LIST.get(nodePath[i]) || [];
      const edge = neighbors.find(n => n.to === nodePath[i + 1]);
      totalDist += edge ? edge.distanceMeters : 4.0;
    }

    // Final branch from entry node to exact shelf coordinates
    const targetNode = NAVIGATION_NODES[dest.targetNodeId];
    if (targetNode) {
      const shelfDx = dest.coordinates.x - targetNode.x;
      const shelfDy = dest.coordinates.y - targetNode.y;
      totalDist += Math.round(Math.sqrt(shelfDx * shelfDx + shelfDy * shelfDy) * PIXEL_TO_METERS * 10) / 10;
    }

    totalDist = Math.max(8, Math.round(totalDist));
    const seconds = Math.round(totalDist / WALKING_SPEED_METERS_PER_SEC);
    const minsFormatted = seconds < 60 ? `~${seconds}s` : `~${Math.ceil(seconds / 60)} min`;

    // Turn-by-turn guidance
    const instructions: string[] = [];
    const waypoints: RouteWaypoint[] = [];

    nodePath.forEach((id, idx) => {
      const node = NAVIGATION_NODES[id];
      if (!node) return;

      let stepText = '';
      if (idx === 0) {
        stepText = `Start at ${node.name}`;
      } else if (idx === nodePath.length - 1) {
        stepText = `Turn into ${product.aisle} toward ${dest.shelfLocation}`;
      } else {
        stepText = `Continue along ${node.name}`;
      }

      instructions.push(stepText);
      waypoints.push({
        nodeId: id,
        name: node.name,
        x: node.x,
        y: node.y,
        instruction: stepText
      });
    });

    instructions.push(`Arrive at shelf: ${dest.shelfLocation} (${product.name})`);

    const pathD = this.generateSvgPathD(nodePath, dest.coordinates);

    return {
      startNodeId,
      destinationNodeId: dest.targetNodeId,
      targetProduct: product,
      targetAisle: product.aisle,
      targetShelf: dest.shelfLocation,
      waypoints,
      pathD,
      totalDistanceMeters: totalDist,
      estimatedWalkingSeconds: seconds,
      estimatedWalkingMinutesFormatted: minsFormatted,
      turnByTurnInstructions: instructions
    };
  }

  /**
   * Calculate route directly to an aisle zone
   */
  public calculateRouteToAisle(
    aisleName: string,
    startNodeId = this.currentCustomerNodeId
  ): CalculatedRoute {
    const matchedZone = STORE_ZONES.find(z => z.aisle.toLowerCase() === aisleName.toLowerCase()) || STORE_ZONES[0];
    const nodePath = this.findShortestPath(startNodeId, matchedZone.entryNodeId);

    let totalDist = 0;
    for (let i = 0; i < nodePath.length - 1; i++) {
      const neighbors = ADJACENCY_LIST.get(nodePath[i]) || [];
      const edge = neighbors.find(n => n.to === nodePath[i + 1]);
      totalDist += edge ? edge.distanceMeters : 4.0;
    }
    totalDist = Math.max(6, Math.round(totalDist));
    const seconds = Math.round(totalDist / WALKING_SPEED_METERS_PER_SEC);
    const minsFormatted = seconds < 60 ? `~${seconds}s` : `~${Math.ceil(seconds / 60)} min`;

    const instructions = nodePath.map((id, idx) => {
      const node = NAVIGATION_NODES[id];
      if (idx === 0) return `Start at ${node.name}`;
      if (idx === nodePath.length - 1) return `Arrive at ${matchedZone.name} (${matchedZone.aisle})`;
      return `Proceed through ${node.name}`;
    });

    const waypoints: RouteWaypoint[] = nodePath.map(id => ({
      nodeId: id,
      name: NAVIGATION_NODES[id].name,
      x: NAVIGATION_NODES[id].x,
      y: NAVIGATION_NODES[id].y,
      instruction: NAVIGATION_NODES[id].description
    }));

    const destCoord = { x: matchedZone.x + matchedZone.w / 2, y: matchedZone.y + matchedZone.h / 2 };
    const pathD = this.generateSvgPathD(nodePath, destCoord);

    return {
      startNodeId,
      destinationNodeId: matchedZone.entryNodeId,
      targetAisle: matchedZone.aisle,
      targetShelf: `${matchedZone.name} Main Bay`,
      waypoints,
      pathD,
      totalDistanceMeters: totalDist,
      estimatedWalkingSeconds: seconds,
      estimatedWalkingMinutesFormatted: minsFormatted,
      turnByTurnInstructions: instructions
    };
  }

  /**
   * Multi-Product Shopping Mission Sequencer
   * Orders pending items in optimal store traversal sequence (Produce -> Grains -> Dairy -> Bakery -> Checkout)
   */
  public planMissionRoute(mission: ShoppingMission, startNodeId = this.currentCustomerNodeId): MultiStopMissionRoute {
    const allProducts = db.getProducts();

    // Natural clockwise aisle flow in supermarket
    const aislePriority: Record<string, number> = {
      'Aisle 1': 1, // Produce
      'Aisle 2': 2, // Roots
      'Aisle 3': 3, // Grains & Oils
      'Aisle 4': 4, // Dairy
      'Aisle 5': 5, // Superfoods
      'Aisle 6': 6, // Bakery
      'Aisle 7': 7, // Snacks
      'Aisle 8': 8, // Beverages
      'Checkout': 9 // Exit
    };

    // Sort items by store traversal priority
    const sortedItems = [...mission.items].sort((a, b) => {
      const pA = aislePriority[a.aisle] || 5;
      const pB = aislePriority[b.aisle] || 5;
      return pA - pB;
    });

    const stops: MissionStop[] = sortedItems.map((item, idx) => {
      const prod = allProducts.find(p => p.id === item.product_id) || {
        id: item.product_id,
        name: item.product_name,
        aisle: item.aisle,
        shelf_location: item.shelf_location || item.aisle
      } as Product;

      const dest = resolveShelfDestination(prod);
      return {
        stopNumber: idx + 1,
        itemId: item.id,
        productId: item.product_id,
        productName: item.product_name,
        aisle: item.aisle,
        shelfLocation: dest.shelfLocation,
        nodeId: dest.targetNodeId,
        coordinates: dest.coordinates,
        isFound: item.status === 'found'
      };
    });

    // Find first unfound item as current destination
    const firstUnfoundIdx = stops.findIndex(s => !s.isFound);
    const currentStopIndex = firstUnfoundIdx >= 0 ? firstUnfoundIdx : stops.length;
    const currentStop = stops[currentStopIndex];
    const nextStops = stops.filter((_, idx) => idx > currentStopIndex && !stops[idx].isFound);

    // Calculate active leg
    let activeLegRoute: CalculatedRoute;
    if (currentStop) {
      const prod = allProducts.find(p => p.id === currentStop.productId) || {
        id: currentStop.productId,
        name: currentStop.productName,
        aisle: currentStop.aisle,
        shelf_location: currentStop.shelfLocation
      } as Product;
      activeLegRoute = this.calculateRouteToProduct(prod, startNodeId);
    } else {
      // All items found! Route to Checkout
      const nodePath = this.findShortestPath(startNodeId, 'node-checkout');
      const pathD = this.generateSvgPathD(nodePath, { x: 380, y: 390 });
      activeLegRoute = {
        startNodeId,
        destinationNodeId: 'node-checkout',
        targetAisle: 'Checkout',
        targetShelf: 'Counter 1–4',
        waypoints: nodePath.map(id => ({
          nodeId: id,
          name: NAVIGATION_NODES[id].name,
          x: NAVIGATION_NODES[id].x,
          y: NAVIGATION_NODES[id].y,
          instruction: NAVIGATION_NODES[id].description
        })),
        pathD,
        totalDistanceMeters: 14,
        estimatedWalkingSeconds: 12,
        estimatedWalkingMinutesFormatted: '~15s',
        turnByTurnInstructions: ['All items collected! Proceed to Checkout Counters 1–4']
      };
    }

    // Connect full tour path through remaining stops to checkout
    const tourNodeSequence: string[] = [startNodeId];
    let prevNode = startNodeId;
    for (let i = currentStopIndex; i < stops.length; i++) {
      const s = stops[i];
      if (!s.isFound) {
        const leg = this.findShortestPath(prevNode, s.nodeId);
        tourNodeSequence.push(...leg.slice(1));
        prevNode = s.nodeId;
      }
    }
    const finalLeg = this.findShortestPath(prevNode, 'node-checkout');
    tourNodeSequence.push(...finalLeg.slice(1));

    const fullTourPathD = this.generateSvgPathD(tourNodeSequence);
    const remainingCount = stops.filter(s => !s.isFound).length;
    const estTotalDist = remainingCount * 18 + 15;
    const estTotalSec = Math.round(estTotalDist / WALKING_SPEED_METERS_PER_SEC);

    return {
      missionId: mission.id,
      missionName: mission.name,
      stops,
      currentStopIndex,
      currentStop,
      nextStops,
      activeLegRoute,
      fullTourPathD,
      totalRemainingDistanceMeters: estTotalDist,
      totalRemainingTimeFormatted: estTotalSec < 60 ? `~${estTotalSec}s` : `~${Math.ceil(estTotalSec / 60)} min`,
      completedStopsCount: stops.filter(s => s.isFound).length,
      totalStopsCount: stops.length
    };
  }
}

export const storeNavigationService = StoreNavigationService.getInstance();
