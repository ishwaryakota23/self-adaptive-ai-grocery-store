import {
  UserProfile,
  CustomerSession,
  ManagerAccount,
  CustomerPreferences,
  Category,
  Product,
  InventoryItem,
  InventoryMovement,
  ShoppingMission,
  ShoppingMissionItem,
  CartItem,
  CustomerRequest,
  SubstitutionRecord,
  NotificationItem,
  SaleRecord,
  StoreEvent,
  HistoricalEvent,
  AisleTraffic,
  CheckoutQueue,
  AIRecommendation,
  OperationalAction,
  ActionOutcome,
  CustomerMemoryInsight,
  StoreMemoryInsight,
  Order,
  PaymentRecord,
} from '../types/index.js';

const STORAGE_KEY = 'grocer_ai_db_v2';

interface DBState {
  customerSessions: CustomerSession[];
  managerAccounts: ManagerAccount[];
  profiles: UserProfile[];
  customerPreferences: CustomerPreferences[];
  categories: Category[];
  products: Product[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  shoppingMissions: ShoppingMission[];
  cartItems: CartItem[];
  customerRequests: CustomerRequest[];
  substitutions: SubstitutionRecord[];
  notifications: NotificationItem[];
  payments: PaymentRecord[];
  sales: SaleRecord[];
  events: HistoricalEvent[];
  storeEvents: StoreEvent[];
  aisleTraffic: AisleTraffic[];
  checkoutQueues: CheckoutQueue[];
  aiRecommendations: AIRecommendation[];
  operationalActions: OperationalAction[];
  actionOutcomes: ActionOutcome[];
  customerMemories: CustomerMemoryInsight[];
  storeMemories: StoreMemoryInsight[];
  orders: Order[];
}

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Dairy', icon: 'Milk', slug: 'dairy', description: 'Fresh milk, paneer, cheeses, yogurts, and butter' },
  { id: 'cat-2', name: 'Fruits & Vegetables', icon: 'Apple', slug: 'fruits-vegetables', description: 'Fresh farm produce, leafy greens, and root veggies' },
  { id: 'cat-3', name: 'Bakery', icon: 'Croissant', slug: 'bakery', description: 'Artisan breads, whole wheat loaves, buns, and crusts' },
  { id: 'cat-4', name: 'Grains & Pasta', icon: 'Wheat', slug: 'grains', description: 'Basmati rice, pasta, flours, and nutritious cereals' },
  { id: 'cat-5', name: 'Snacks', icon: 'Cookie', slug: 'snacks', description: 'Crunchy biscuits, healthy chips, and gourmet treats' },
  { id: 'cat-6', name: 'Beverages', icon: 'Coffee', slug: 'beverages', description: 'Artisan coffees, refreshing teas, and cold pressed juices' },
  { id: 'cat-7', name: 'Staples & Oils', icon: 'Flame', slug: 'staples', description: 'Pure extra virgin oils, sauces, spices, and seasonings' },
  { id: 'cat-8', name: 'Personal Care', icon: 'Sparkles', slug: 'personal-care', description: 'Soaps, handwashes, shampoos, and hygiene essentials' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-paneer',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Amul Fresh Paneer 200g',
    brand: 'Amul',
    description: 'Soft and fresh malai paneer, rich in protein. Perfect for your favorite curries, butter paneer, and tikkas.',
    price: 85,
    original_price: 95,
    discount_percentage: 10,
    weight_or_volume: '200g',
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf B2 (Chilled)',
    nutrition: { calories: 265, protein: '18g', fat: '20g', carbs: '4g', serving_size: '100g' },
    tags: ['Fresh', 'High Protein', 'No Preservatives'],
    rating: 4.8,
    reviews_count: 1240,
    is_organic: false,
  },
  {
    id: 'prod-tomatoes',
    category_id: 'cat-2',
    category_name: 'Fruits & Vegetables',
    name: 'Farm Fresh Red Tomatoes 1kg',
    brand: 'FarmDirect',
    description: 'Vine-ripened, juicy red tomatoes packed with lycopene and vitamin C. Ideal for curries, salads, and pasta sauces.',
    price: 40,
    original_price: 48,
    discount_percentage: 17,
    weight_or_volume: '1 kg',
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 1',
    shelf_location: 'Fruits & Veg Section, Aisle 1 - Bin 4',
    nutrition: { calories: 18, protein: '0.9g', fat: '0.2g', carbs: '3.9g', serving_size: '100g' },
    tags: ['Farm Fresh', 'High Vitamin C', 'Salad Base'],
    rating: 4.6,
    reviews_count: 890,
    is_organic: true,
  },
  {
    id: 'prod-onions',
    category_id: 'cat-2',
    category_name: 'Fruits & Vegetables',
    name: 'Nashik Red Onions 1kg',
    brand: 'FarmDirect',
    description: 'Pungent, crispy, high-quality onions sourced directly from Nashik farms. Essential base for gravies.',
    price: 30,
    original_price: 35,
    discount_percentage: 14,
    weight_or_volume: '1 kg',
    image_url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 2',
    shelf_location: 'Fruits & Veg Section, Aisle 2 - Bin 1',
    nutrition: { calories: 40, protein: '1.1g', fat: '0.1g', carbs: '9.3g', serving_size: '100g' },
    tags: ['Crisp', 'Kitchen Staple', 'Nashik Special'],
    rating: 4.5,
    reviews_count: 620,
    is_organic: false,
  },
  {
    id: 'prod-pasta',
    category_id: 'cat-4',
    category_name: 'Grains & Pasta',
    name: 'Pasta (Borges) 500g Penne',
    brand: 'Borges',
    description: '100% durum wheat semolina Italian penne rigate pasta. Rich in fiber and delicious al dente texture.',
    price: 60,
    original_price: 75,
    discount_percentage: 20,
    weight_or_volume: '500g',
    image_url: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 3',
    shelf_location: 'Grains Section, Aisle 3 - Shelf A3',
    nutrition: { calories: 350, protein: '12g', fat: '1.5g', carbs: '72g', serving_size: '100g' },
    tags: ['100% Durum', 'Imported', 'Fiber Rich'],
    rating: 4.7,
    reviews_count: 750,
    is_organic: false,
  },
  {
    id: 'prod-oliveoil',
    category_id: 'cat-7',
    category_name: 'Staples & Oils',
    name: 'Figaro Extra Virgin Olive Oil 500ml',
    brand: 'Figaro',
    description: 'Cold-extracted extra virgin olive oil from Spain. Excellent for sautéing, pasta dressings, and dips.',
    price: 450,
    original_price: 520,
    discount_percentage: 13,
    weight_or_volume: '500ml',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 3',
    shelf_location: 'Staples & Oils, Aisle 3 - Shelf C1',
    nutrition: { calories: 884, protein: '0g', fat: '100g', carbs: '0g', serving_size: '100ml' },
    tags: ['Cold Pressed', 'Heart Healthy', 'Spanish'],
    rating: 4.9,
    reviews_count: 430,
    is_organic: true,
  },
  {
    id: 'prod-cheese',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Amul Processed Cheese Block 200g',
    brand: 'Amul',
    description: 'Rich and creamy processed cheddar cheese block. Melts effortlessly on pasta, pizzas, and toasts.',
    price: 135,
    original_price: 145,
    discount_percentage: 7,
    weight_or_volume: '200g',
    image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf B1',
    nutrition: { calories: 320, protein: '20g', fat: '26g', carbs: '2g', serving_size: '100g' },
    tags: ['Creamy', 'Melts Easily', 'Calcium Rich'],
    rating: 4.8,
    reviews_count: 980,
    is_organic: false,
  },
  {
    id: 'prod-garlic',
    category_id: 'cat-2',
    category_name: 'Fruits & Vegetables',
    name: 'Fresh Organic Garlic 250g',
    brand: 'OrganicTattva',
    description: 'Potent aroma and unbleached organic garlic cloves. Perfect seasoning for Italian and Indian cooking.',
    price: 45,
    original_price: 50,
    discount_percentage: 10,
    weight_or_volume: '250g',
    image_url: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 1',
    shelf_location: 'Fruits & Veg Section, Aisle 1 - Bin 7',
    nutrition: { calories: 149, protein: '6.4g', fat: '0.5g', carbs: '33g', serving_size: '100g' },
    tags: ['Organic', 'Aromatic', 'Immunity'],
    rating: 4.6,
    reviews_count: 310,
    is_organic: true,
  },
  {
    id: 'prod-greekyogurt',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Epigamia Greek Yogurt Natural 200g',
    brand: 'Epigamia',
    description: 'Authentic Greek strained yogurt with zero added sugar and double protein. Silky and refreshing.',
    price: 60,
    original_price: 65,
    discount_percentage: 8,
    weight_or_volume: '200g',
    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf A2',
    nutrition: { calories: 110, protein: '10g', fat: '4g', carbs: '6g', serving_size: '100g' },
    tags: ['High Protein', 'No Added Sugar', 'Probiotic'],
    rating: 4.7,
    reviews_count: 540,
    is_organic: false,
  },
  {
    id: 'prod-almondmilk',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Raw Pressery Almond Milk 1L',
    brand: 'Raw Pressery',
    description: '100% plant-based almond milk made from selected California almonds. Lactose-free and vegan.',
    price: 180,
    original_price: 200,
    discount_percentage: 10,
    weight_or_volume: '1L',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf D1 (Plant Milks)',
    nutrition: { calories: 30, protein: '1g', fat: '2.5g', carbs: '1g', serving_size: '200ml' },
    tags: ['Vegan', 'Lactose Free', 'Keto Friendly'],
    rating: 4.5,
    reviews_count: 290,
    is_organic: true,
  },
  {
    id: 'prod-quinoa',
    category_id: 'cat-4',
    category_name: 'Grains & Pasta',
    name: 'Organic Royal Quinoa 500g',
    brand: 'TrueElements',
    description: 'Gluten-free Andean whole grain quinoa. Complete amino acid profile with all 9 essential proteins.',
    price: 220,
    original_price: 260,
    discount_percentage: 15,
    weight_or_volume: '500g',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 5',
    shelf_location: 'Grains Section, Aisle 5 - Shelf C3',
    nutrition: { calories: 368, protein: '14g', fat: '6g', carbs: '64g', serving_size: '100g' },
    tags: ['Superfood', 'Gluten Free', 'Complete Protein'],
    rating: 4.8,
    reviews_count: 380,
    is_organic: true,
  },
  {
    id: 'prod-tofu',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Mori-Nu Silken Organic Tofu 340g',
    brand: 'Mori-Nu',
    description: 'Smooth and creamy non-GMO organic silken tofu. Perfect dairy-free paneer alternative.',
    price: 140,
    original_price: 160,
    discount_percentage: 12,
    weight_or_volume: '340g',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf D3 (Plant Protein)',
    nutrition: { calories: 85, protein: '9g', fat: '4.5g', carbs: '2g', serving_size: '100g' },
    tags: ['Organic', 'Vegan', 'Silken Tofu'],
    rating: 4.6,
    reviews_count: 210,
    is_organic: true,
  },
  {
    id: 'prod-bread',
    category_id: 'cat-3',
    category_name: 'Bakery',
    name: 'Zero Maida Whole Wheat Bread 400g',
    brand: 'HealthFactory',
    description: '100% whole wheat sliced loaf with zero added chemicals, palm oil, or refined maida flour.',
    price: 55,
    original_price: 60,
    discount_percentage: 8,
    weight_or_volume: '400g',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 6',
    shelf_location: 'Bakery Section, Aisle 6 - Rack 1',
    nutrition: { calories: 240, protein: '8.5g', fat: '2.1g', carbs: '46g', serving_size: '100g' },
    tags: ['Zero Maida', 'Clean Label', 'Fiber Rich'],
    rating: 4.7,
    reviews_count: 720,
    is_organic: false,
  },
  {
    id: 'prod-taaza-milk',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Amul Taaza Toned Milk 1L',
    brand: 'Amul',
    description: 'Fresh pasteurized homogenized toned milk rich in calcium and vitamin D.',
    price: 54,
    original_price: 56,
    discount_percentage: 4,
    weight_or_volume: '1L',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf A1 (Chilled)',
    nutrition: { calories: 58, protein: '3.1g', fat: '3.0g', carbs: '4.7g', serving_size: '100ml' },
    tags: ['Fresh Milk', 'Daily Essential', 'Calcium Rich'],
    rating: 4.8,
    reviews_count: 1420,
    is_organic: false,
  },
  {
    id: 'prod-curd',
    category_id: 'cat-1',
    category_name: 'Dairy',
    name: 'Milky Mist Farm Fresh Curd 500g',
    brand: 'Milky Mist',
    description: 'Thick, creamy, and natural dahi made from pure cow milk. Ideal substitute: Epigamia Greek Yogurt.',
    price: 45,
    original_price: 50,
    discount_percentage: 10,
    weight_or_volume: '500g',
    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
    aisle: 'Aisle 4',
    shelf_location: 'Dairy Section, Aisle 4 - Shelf A2',
    nutrition: { calories: 60, protein: '3.5g', fat: '3.2g', carbs: '4.4g', serving_size: '100g' },
    tags: ['Fresh Curd', 'Probiotic', 'No Preservatives'],
    rating: 4.6,
    reviews_count: 890,
    is_organic: false,
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', product_id: 'prod-paneer', quantity: 0, reorder_threshold: 15, last_updated: '2026-09-28T18:30:00Z', status: 'out_of_stock', max_capacity: 60 },
  { id: 'inv-2', product_id: 'prod-tomatoes', quantity: 5, reorder_threshold: 20, last_updated: '2026-09-28T18:45:00Z', status: 'low_stock', max_capacity: 80 },
  { id: 'inv-3', product_id: 'prod-onions', quantity: 38, reorder_threshold: 15, last_updated: '2026-09-28T17:00:00Z', status: 'in_stock', max_capacity: 80 },
  { id: 'inv-4', product_id: 'prod-pasta', quantity: 24, reorder_threshold: 10, last_updated: '2026-09-28T16:00:00Z', status: 'in_stock', max_capacity: 50 },
  { id: 'inv-5', product_id: 'prod-oliveoil', quantity: 18, reorder_threshold: 5, last_updated: '2026-09-28T15:00:00Z', status: 'in_stock', max_capacity: 30 },
  { id: 'inv-6', product_id: 'prod-cheese', quantity: 14, reorder_threshold: 10, last_updated: '2026-09-28T18:10:00Z', status: 'in_stock', max_capacity: 40 },
  { id: 'inv-7', product_id: 'prod-garlic', quantity: 22, reorder_threshold: 10, last_updated: '2026-09-28T17:30:00Z', status: 'in_stock', max_capacity: 40 },
  { id: 'inv-8', product_id: 'prod-greekyogurt', quantity: 2, reorder_threshold: 12, last_updated: '2026-09-28T18:00:00Z', status: 'low_stock', max_capacity: 35 },
  { id: 'inv-9', product_id: 'prod-almondmilk', quantity: 2, reorder_threshold: 8, last_updated: '2026-09-28T17:45:00Z', status: 'low_stock', max_capacity: 25 },
  { id: 'inv-10', product_id: 'prod-quinoa', quantity: 5, reorder_threshold: 10, last_updated: '2026-09-28T16:20:00Z', status: 'low_stock', max_capacity: 30 },
  { id: 'inv-11', product_id: 'prod-tofu', quantity: 4, reorder_threshold: 10, last_updated: '2026-09-28T16:50:00Z', status: 'low_stock', max_capacity: 25 },
  { id: 'inv-12', product_id: 'prod-bread', quantity: 19, reorder_threshold: 10, last_updated: '2026-09-28T18:15:00Z', status: 'in_stock', max_capacity: 40 },
  { id: 'inv-13', product_id: 'prod-taaza-milk', quantity: 40, reorder_threshold: 15, last_updated: '2026-09-28T18:15:00Z', status: 'in_stock', max_capacity: 60 },
  { id: 'inv-14', product_id: 'prod-curd', quantity: 0, reorder_threshold: 20, last_updated: '2026-09-28T18:30:00Z', status: 'out_of_stock', max_capacity: 50 },
];

export const INITIAL_INVENTORY_MOVEMENTS: InventoryMovement[] = [
  { id: 'mov-1', product_id: 'prod-paneer', product_name: 'Amul Fresh Paneer 200g', movement_type: 'SALE', quantity_change: -12, previous_quantity: 12, new_quantity: 0, reason: 'Front checkout sales wave', related_order_id: 'ord-hist-98', created_at: '2026-09-28T18:20:00Z' },
  { id: 'mov-2', product_id: 'prod-tomatoes', product_name: 'Farm Fresh Red Tomatoes', movement_type: 'SALE', quantity_change: -15, previous_quantity: 20, new_quantity: 5, reason: 'Evening produce rush', related_order_id: 'ord-hist-95', created_at: '2026-09-28T17:45:00Z' },
  { id: 'mov-3', product_id: 'prod-pasta', product_name: 'Pasta (Borges) 500g', movement_type: 'RESTOCK', quantity_change: 30, previous_quantity: 4, new_quantity: 34, reason: 'Automated morning warehouse restock', created_at: '2026-09-27T08:30:00Z' },
  { id: 'mov-4', product_id: 'prod-greekyogurt', product_name: 'Epigamia Greek Yogurt Natural', movement_type: 'SALE', quantity_change: -10, previous_quantity: 12, new_quantity: 2, reason: 'Customer purchase surge', related_order_id: 'ord-hist-88', created_at: '2026-09-28T16:30:00Z' }
];

export const INITIAL_SUBSTITUTIONS: SubstitutionRecord[] = [
  {
    id: 'sub-1',
    customer_session_id: 'USER00003',
    requested_product_name: 'Curd / Plain Dahi',
    requested_product_available: false,
    substitute_product_id: 'prod-greekyogurt',
    substitute_product_name: 'Epigamia Greek Yogurt Natural 200g',
    substitute_suggested: true,
    substitute_accepted: true,
    substitute_purchased: true,
    related_order_id: 'ord-hist-99',
    quantity: 1,
    timestamp: '2026-09-28T17:10:00Z'
  },
  {
    id: 'sub-2',
    customer_session_id: 'USER00004',
    requested_product_name: 'Paneer 200g',
    requested_product_available: false,
    substitute_product_id: 'prod-tofu',
    substitute_product_name: 'Mori-Nu Silken Organic Tofu 340g',
    substitute_suggested: true,
    substitute_accepted: true,
    substitute_purchased: false,
    quantity: 1,
    timestamp: '2026-09-28T18:40:00Z'
  }
];

export const INITIAL_MISSION: ShoppingMission = {
  id: 'mission-pasta-night',
  customer_id: 'USER00001',
  name: 'Pasta Night Mission',
  budget: 650,
  status: 'active',
  estimated_time_mins: 12,
  created_at: '2026-09-28T18:40:00Z',
  items: [
    { id: 'm-item-1', mission_id: 'mission-pasta-night', product_id: 'prod-pasta', product_name: 'Pasta (Borges) 500g', quantity: 1, status: 'found', aisle: 'Aisle 3', found_at: '2026-09-28T18:45:00Z', shelf_location: 'Grains Section, Aisle 3 - Shelf A3' },
    { id: 'm-item-2', mission_id: 'mission-pasta-night', product_id: 'prod-tomatoes', product_name: 'Fresh Tomatoes 1kg', quantity: 1, status: 'found', aisle: 'Aisle 1', found_at: '2026-09-28T18:48:00Z', shelf_location: 'Fruits & Veg, Aisle 1 - Bin 4' },
    { id: 'm-item-3', mission_id: 'mission-pasta-night', product_id: 'prod-onions', product_name: 'Onions 1kg', quantity: 1, status: 'found', aisle: 'Aisle 2', found_at: '2026-09-28T18:50:00Z', shelf_location: 'Fruits & Veg, Aisle 2 - Bin 1' },
    { id: 'm-item-4', mission_id: 'mission-pasta-night', product_id: 'prod-cheese', product_name: 'Amul Cheese Block', quantity: 1, status: 'in_progress', aisle: 'Aisle 4', shelf_location: 'Dairy Section, Aisle 4 - Shelf B1' },
    { id: 'm-item-5', mission_id: 'mission-pasta-night', product_id: 'prod-oliveoil', product_name: 'Figaro Olive Oil 500ml', quantity: 1, status: 'pending', aisle: 'Aisle 3', shelf_location: 'Staples & Oils, Aisle 3 - Shelf C2' },
    { id: 'm-item-6', mission_id: 'mission-pasta-night', product_id: 'prod-garlic', product_name: 'Organic Garlic 250g', quantity: 1, status: 'pending', aisle: 'Aisle 1', shelf_location: 'Fruits & Veg, Aisle 1 - Bin 7' },
  ]
};

export const INITIAL_MISSION_USER2: ShoppingMission = {
  id: 'mission-breakfast-dairy',
  customer_id: 'USER00002',
  name: 'Breakfast & Dairy Mission',
  budget: 450,
  status: 'active',
  estimated_time_mins: 8,
  created_at: '2026-09-28T19:00:00Z',
  items: [
    { id: 'm-u2-1', mission_id: 'mission-breakfast-dairy', product_id: 'prod-taaza-milk', product_name: 'Amul Taaza Toned Milk 1L', quantity: 2, status: 'pending', aisle: 'Aisle 4', shelf_location: 'Dairy Section, Aisle 4 - Shelf A1' },
    { id: 'm-u2-2', mission_id: 'mission-breakfast-dairy', product_id: 'prod-bread', product_name: 'Zero Maida Whole Wheat Bread 400g', quantity: 1, status: 'pending', aisle: 'Aisle 6', shelf_location: 'Bakery Section, Aisle 6 - Rack 1' },
    { id: 'm-u2-3', mission_id: 'mission-breakfast-dairy', product_id: 'prod-curd', product_name: 'Milky Mist Farm Fresh Curd 500g', quantity: 1, status: 'pending', aisle: 'Aisle 4', shelf_location: 'Dairy Section, Aisle 4 - Shelf A2' }
  ]
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    customer_id: 'USER00001',
    type: 'product_found',
    title: 'Did you find the cheese?',
    message: "It's available in Dairy Section, Aisle 4.",
    product_id: 'prod-cheese',
    product_name: 'Amul Cheese Block',
    aisle: 'Aisle 4',
    read: false,
    created_at: '2 minutes ago',
    actions: [
      { type: 'play_voice', label: 'Play' },
      { type: 'view_location', label: 'View Location', route: '/customer/map?product=prod-cheese' },
      { type: 'mark_found', label: 'Mark Found' }
    ]
  },
  {
    id: 'notif-2',
    customer_id: 'USER00001',
    type: 'low_stock',
    title: 'Tomatoes are running low',
    message: 'Only 5 packs left. Would you like me to reserve one?',
    product_id: 'prod-tomatoes',
    product_name: 'Farm Fresh Red Tomatoes',
    aisle: 'Aisle 1',
    read: false,
    created_at: '5 minutes ago',
    actions: [
      { type: 'play_voice', label: 'Play' },
      { type: 'reserve', label: 'Reserve Now' }
    ]
  },
  {
    id: 'notif-3',
    customer_id: 'USER00001',
    type: 'nearby_offer',
    title: 'Special offer nearby!',
    message: 'Get 20% off on pasta sauces in Aisle 3.',
    product_id: 'prod-pasta',
    aisle: 'Aisle 3',
    read: true,
    created_at: '10 minutes ago',
    actions: [
      { type: 'play_voice', label: 'Play' },
      { type: 'view_deal', label: 'View Deal' }
    ]
  },
  {
    id: 'notif-4',
    customer_id: 'USER00001',
    type: 'navigation',
    title: "You haven't checked cheese yet",
    message: 'Need directions to Aisle 4?',
    product_id: 'prod-cheese',
    product_name: 'Amul Processed Cheese Block',
    aisle: 'Aisle 4',
    read: false,
    created_at: '12 minutes ago',
    actions: [
      { type: 'play_voice', label: 'Play' },
      { type: 'view_location', label: 'Direct Me', route: '/customer/map?product=prod-cheese' }
    ]
  }
];

export const INITIAL_REQUESTS: CustomerRequest[] = [
  { id: 'req-1', customer_id: 'USER00001', customer_name: 'Ishwarya Kota', product_id: 'prod-paneer', product_name: 'Paneer 200g', request_text: 'Where is paneer?', request_count: 28, created_at: '2026-09-28T18:55:00Z', status: 'unavailable', mode: 'voice' },
  { id: 'req-2', customer_id: 'USER00002', customer_name: 'Rahul Sen', product_id: 'prod-greekyogurt', product_name: 'Greek Yogurt', request_text: 'Looking for Epigamia Greek yogurt', request_count: 16, created_at: '2026-09-28T18:42:00Z', status: 'unavailable', mode: 'chat' },
  { id: 'req-3', customer_id: 'USER00003', customer_name: 'Ananya Sharma', product_id: 'prod-almondmilk', product_name: 'Almond Milk', request_text: 'Is unsweetened almond milk in stock?', request_count: 12, created_at: '2026-09-28T18:30:00Z', status: 'unavailable', mode: 'voice' },
  { id: 'req-4', customer_id: 'USER00004', customer_name: 'Devendra K.', product_id: 'prod-quinoa', product_name: 'Organic Quinoa', request_text: 'Quinoa packets location', request_count: 8, created_at: '2026-09-28T17:15:00Z', status: 'pending', mode: 'voice' },
  { id: 'req-5', customer_id: 'USER00005', customer_name: 'Sneha Patel', product_id: 'prod-tofu', product_name: 'Silken Tofu', request_text: 'Gluten-free silken tofu', request_count: 6, created_at: '2026-09-28T16:50:00Z', status: 'pending', mode: 'chat' },
];

export const INITIAL_CHECKOUT_QUEUES: CheckoutQueue[] = [
  { id: 'queue-1', counter_number: 1, customer_count: 2, estimated_wait_mins: 1.0, status: 'open', operator_name: 'Ramesh K.', recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'queue-2', counter_number: 2, customer_count: 5, estimated_wait_mins: 4.0, status: 'open', operator_name: 'Sunita P.', recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'queue-3', counter_number: 3, customer_count: 8, estimated_wait_mins: 7.0, status: 'congested', operator_name: 'Priya M.', recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'queue-4', counter_number: 4, customer_count: 0, estimated_wait_mins: 0.0, status: 'closed', operator_name: 'Standby', recorded_at: '2026-09-28T19:00:00Z' },
];

export const INITIAL_AI_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: 'rec-1',
    type: 'restock',
    title: 'Restock Paneer 200g',
    description: 'Current stock is 0. 28 customer requests logged in last 2 hours.',
    product_id: 'prod-paneer',
    product_name: 'Amul Fresh Paneer 200g',
    suggested_action: 'Restock 50 packs to Dairy Section, Aisle 4',
    confidence: 0.94,
    priority: 'urgent',
    expected_impact: '+45% sales recovery',
    historical_evidence: 'Paneer restocking previously increased sales by 38% on weekends with zero wasted surplus.',
    status: 'pending',
    created_at: 'Today, 10:00 AM'
  },
  {
    id: 'rec-2',
    type: 'restock',
    title: 'Restock Greek Yogurt',
    description: 'Current stock is 2 packs (below threshold of 12). 16 customer requests.',
    product_id: 'prod-greekyogurt',
    product_name: 'Epigamia Greek Yogurt Natural',
    suggested_action: 'Restock 30 packs to Dairy Section',
    confidence: 0.88,
    priority: 'high',
    expected_impact: '+32% category sales',
    historical_evidence: 'High weekend demand for high-protein probiotic yogurts observed for 3 consecutive weeks.',
    status: 'pending',
    created_at: 'Today, 11:15 AM'
  },
  {
    id: 'rec-3',
    type: 'restock',
    title: 'Restock Almond Milk',
    description: 'Current stock is 2 units. 12 plant-based customer queries.',
    product_id: 'prod-almondmilk',
    product_name: 'Raw Pressery Almond Milk',
    suggested_action: 'Restock 20 packs to Aisle 4 Shelf D1',
    confidence: 0.85,
    priority: 'medium',
    expected_impact: '+28% plant milk sales',
    historical_evidence: 'Vegan milk sales peak on Saturday and Sunday mornings.',
    status: 'pending',
    created_at: 'Today, 12:40 PM'
  },
  {
    id: 'rec-4',
    type: 'open_counter',
    title: 'Open Checkout Counter 4',
    description: 'Counter 3 has 8 customers waiting (7 min wait). Queue threshold exceeded.',
    target_counter: 4,
    suggested_action: 'Open Counter 4 immediately to alleviate front congestion',
    confidence: 0.96,
    priority: 'urgent',
    expected_impact: 'Reduces queue wait from 7.0 mins to 2.2 mins',
    historical_evidence: 'Opening 4th counter during evening rush maintains 98% customer satisfaction score.',
    status: 'pending',
    created_at: 'Today, 06:45 PM'
  }
];

export const INITIAL_ACTION_OUTCOMES: ActionOutcome[] = [
  {
    id: 'out-1',
    action_id: 'act-1',
    title: 'Paneer Restocking & Demand Fulfillment',
    timestamp: 'Today, 06:01 PM',
    observed_event: 'Stocked 50 packs of paneer (Today, 10:00 AM) following stockout detection.',
    action_taken: 'Manager approved AI recommendation and replenished Aisle 4 shelf B2.',
    reobserved_metric: 'Observed increased demand: 42 of 50 packs sold within 4 hours (+26% sales surge).',
    outcome_summary: 'Customer satisfaction improved (+20% positive feedback). Zero missed requests reported in afternoon.',
    satisfaction_delta: '+20% positive feedback',
    sales_delta: '+26% sales',
    is_hindsight_stored: true,
    hindsight_id: 'hs-store-mem-8842'
  },
  {
    id: 'out-2',
    action_id: 'act-2',
    title: 'Weekend Rush Queue Mitigation',
    timestamp: 'Yesterday, 07:30 PM',
    observed_event: 'Queue wait surged to 6.8 mins across counters 1, 2, and 3.',
    action_taken: 'Automated notification triggered opening of Counter 4.',
    reobserved_metric: 'Average wait time dropped to 2.1 mins within 8 minutes.',
    outcome_summary: 'No cart abandonment observed. Transaction throughput rose by 34%.',
    satisfaction_delta: '+15% CSAT',
    sales_delta: '+18% throughput',
    is_hindsight_stored: true,
    hindsight_id: 'hs-store-mem-8843'
  }
];

export const INITIAL_CUSTOMER_MEMORIES: CustomerMemoryInsight[] = [
  {
    id: 'cm-1',
    customer_id: 'USER00001',
    type: 'preference',
    title: 'Prefers Amul Brand',
    description: 'Frequently selects Amul for Dairy items (suggested & accepted 3 past times).',
    tag: 'Brand Affinity',
    confidence: 0.96,
    first_observed: '2026-08-10',
    last_reinforced: 'Today',
    times_applied: 5
  },
  {
    id: 'cm-2',
    customer_id: 'USER00001',
    type: 'recipe',
    title: 'Likes Italian recipes',
    description: 'Regularly creates shopping missions containing pasta, olive oil, garlic, and fresh herbs.',
    tag: 'Cuisine Pattern',
    confidence: 0.92,
    first_observed: '2026-08-15',
    last_reinforced: 'Today',
    times_applied: 4
  },
  {
    id: 'cm-3',
    customer_id: 'USER00001',
    type: 'frequency',
    title: 'Buys organic vegetables',
    description: 'Chooses organic tomatoes, garlic, and greens when available (frequency: weekly).',
    tag: 'Health Profile',
    confidence: 0.89,
    first_observed: '2026-08-01',
    last_reinforced: 'Today',
    times_applied: 6
  },
  {
    id: 'cm-4',
    customer_id: 'USER00001',
    type: 'habit',
    title: 'Usually shops on weekends',
    description: 'Visits physical store primarily between 5:00 PM and 7:30 PM on Saturdays and Sundays.',
    tag: 'Shopping Habit',
    confidence: 0.94,
    first_observed: '2026-07-20',
    last_reinforced: 'Today',
    times_applied: 8
  }
];

export const INITIAL_STORE_MEMORIES: StoreMemoryInsight[] = [
  {
    id: 'sm-1',
    type: 'stockout_pattern',
    title: 'Paneer stockout on 15 Sep',
    observation: 'Stockout occurred at 11:30 AM during festival prep weekend.',
    consequence: 'Caused 42 lost customer sales and 19 alternative queries.',
    learned_rule: 'Pre-order 1.8x paneer units on pre-holiday and weekend mornings.',
    confidence: 0.98,
    is_hindsight_synced: true,
    recorded_at: '2026-09-15T18:00:00Z'
  },
  {
    id: 'sm-2',
    type: 'rush_hour',
    title: 'Weekend evening rush',
    observation: 'Footfall spikes by 140% between 5:30 PM and 7:45 PM on Saturdays.',
    consequence: 'Average queue wait time increases to 6.4 minutes without counter 4.',
    learned_rule: 'Pre-emptively staff and activate Counter 4 at 5:15 PM every Saturday.',
    confidence: 0.95,
    is_hindsight_synced: true,
    recorded_at: '2026-09-20T20:00:00Z'
  },
  {
    id: 'sm-3',
    type: 'demand_surge',
    title: 'High demand for organic products',
    observation: 'Observed 32% year-over-year surge in organic produce and cold-pressed oils.',
    consequence: 'Standard conventional stock left stagnant while organic bins emptied before 4 PM.',
    learned_rule: 'Shift floor allocation in Aisle 1 to 60% organic produce display.',
    confidence: 0.91,
    is_hindsight_synced: true,
    recorded_at: '2026-09-22T14:00:00Z'
  },
  {
    id: 'sm-4',
    type: 'price_elasticity',
    title: 'Tomato prices increased',
    observation: 'Wholesale price spike triggered 18% retail adjustment.',
    consequence: 'Triggered customer alternative inquiries for canned purées.',
    learned_rule: 'Offer bundle discounts with pasta & spices when tomato prices spike.',
    confidence: 0.88,
    is_hindsight_synced: true,
    recorded_at: '2026-09-25T11:00:00Z'
  }
];

export const INITIAL_AISLE_TRAFFIC: AisleTraffic[] = [
  { id: 'tr-1', aisle: 'Aisle 1', aisle_name: 'Fruits & Vegetables', customer_count: 28, density: 'high', peak_hours: '5:00 PM - 7:00 PM', avg_dwell_time_mins: 4.2, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-2', aisle: 'Aisle 2', aisle_name: 'Roots & Staple Veggies', customer_count: 14, density: 'moderate', peak_hours: '4:30 PM - 6:30 PM', avg_dwell_time_mins: 2.5, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-3', aisle: 'Aisle 3', aisle_name: 'Grains, Pasta & Oils', customer_count: 18, density: 'moderate', peak_hours: '5:30 PM - 7:30 PM', avg_dwell_time_mins: 3.8, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-4', aisle: 'Aisle 4', aisle_name: 'Dairy & Chilled Section', customer_count: 34, density: 'high', peak_hours: '6:00 PM - 8:00 PM', avg_dwell_time_mins: 5.1, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-5', aisle: 'Aisle 5', aisle_name: 'Superfoods & Pulses', customer_count: 9, density: 'low', peak_hours: '3:00 PM - 5:00 PM', avg_dwell_time_mins: 2.1, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-6', aisle: 'Aisle 6', aisle_name: 'Bakery & Artisan Bread', customer_count: 15, density: 'moderate', peak_hours: '5:00 PM - 7:00 PM', avg_dwell_time_mins: 3.0, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-7', aisle: 'Aisle 7', aisle_name: 'Snacks & Biscuits', customer_count: 12, density: 'moderate', peak_hours: '6:00 PM - 8:00 PM', avg_dwell_time_mins: 2.8, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-8', aisle: 'Aisle 8', aisle_name: 'Beverages & Coffee', customer_count: 10, density: 'low', peak_hours: '4:00 PM - 6:00 PM', avg_dwell_time_mins: 2.3, recorded_at: '2026-09-28T19:00:00Z' },
  { id: 'tr-9', aisle: 'Checkout', aisle_name: 'Checkout & Exit Area', customer_count: 19, density: 'critical', peak_hours: '6:30 PM - 8:30 PM', avg_dwell_time_mins: 4.8, recorded_at: '2026-09-28T19:00:00Z' },
];

export const INITIAL_HISTORICAL_EVENTS: HistoricalEvent[] = [
  { event_id: 'ev-h-1', event_type: 'PRODUCT_SEARCH', customer_session_id: 'USER00001', product_name: 'Amul Fresh Paneer', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', timestamp: '2026-09-28T18:40:00Z' },
  { event_id: 'ev-h-2', event_type: 'AVAILABILITY_CHECK', customer_session_id: 'USER00001', product_id: 'prod-paneer', product_name: 'Amul Fresh Paneer', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', metadata: { available: false, stock: 0 }, timestamp: '2026-09-28T18:41:00Z' },
  { event_id: 'ev-h-3', event_type: 'SUBSTITUTION_SUGGESTED', customer_session_id: 'USER00001', product_id: 'prod-tofu', product_name: 'Silken Tofu', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', metadata: { original: 'Paneer', substitute: 'Tofu' }, timestamp: '2026-09-28T18:41:30Z' },
  { event_id: 'ev-h-4', event_type: 'PRODUCT_SEARCH', customer_session_id: 'USER00002', product_name: 'Durum Wheat Pasta', store_id: 'BRANCH-104', source: 'MOBILE', timestamp: '2026-09-28T18:43:00Z' },
  { event_id: 'ev-h-5', event_type: 'CART_ADD', customer_session_id: 'USER00001', product_id: 'prod-pasta', product_name: 'Borges Whole Wheat Penne', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', timestamp: '2026-09-28T18:46:00Z' },
  { event_id: 'ev-h-6', event_type: 'CART_ADD', customer_session_id: 'USER00001', product_id: 'prod-tomatoes', product_name: 'Farm Fresh Red Tomatoes', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', timestamp: '2026-09-28T18:48:00Z' },
  { event_id: 'ev-h-7', event_type: 'CHECKOUT_STARTED', customer_session_id: 'USER00003', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', metadata: { itemsCount: 3, cartTotal: 285 }, timestamp: '2026-09-28T17:15:00Z' },
  { event_id: 'ev-h-8', event_type: 'ORDER_CONFIRMED', customer_session_id: 'USER00003', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', related_order_id: 'ord-hist-99', metadata: { amount: 285 }, timestamp: '2026-09-28T17:18:00Z' },
  { event_id: 'ev-h-9', event_type: 'CHECKOUT_STARTED', customer_session_id: 'USER00004', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', metadata: { cartTotal: 180 }, timestamp: '2026-09-28T17:50:00Z' },
  { event_id: 'ev-h-10', event_type: 'CHECKOUT_ABANDONED', customer_session_id: 'USER00004', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', metadata: { reason: 'Shopper exited before payment' }, timestamp: '2026-09-28T17:54:00Z' },
  { event_id: 'ev-h-11', event_type: 'PRODUCT_SEARCH', customer_session_id: 'USER00005', product_name: 'Curd', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', timestamp: '2026-09-28T16:00:00Z' },
  { event_id: 'ev-h-12', event_type: 'PRODUCT_VIEW', customer_session_id: 'USER00005', product_id: 'prod-greekyogurt', product_name: 'Greek Yogurt', store_id: 'BRANCH-104', source: 'LARGE_DISPLAY', timestamp: '2026-09-28T16:02:00Z' }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-hist-99',
    customer_id: 'USER00003',
    subtotal: 270,
    tax: 15,
    total_amount: 285,
    payment_method: 'UPI',
    payment_status: 'PAYMENT_SUCCESS',
    status: 'completed',
    items: [
      { product_id: 'prod-greekyogurt', product_name: 'Epigamia Greek Yogurt Natural 200g', quantity: 2, price: 60 },
      { product_id: 'prod-cheese', product_name: 'Amul Processed Cheese Block 200g', quantity: 1, price: 135 }
    ],
    created_at: '2026-09-28T17:18:00Z'
  },
  {
    id: 'ord-hist-98',
    customer_id: 'USER00002',
    subtotal: 1020,
    tax: 51,
    total_amount: 1071,
    payment_method: 'Card',
    payment_status: 'PAYMENT_SUCCESS',
    status: 'completed',
    items: [
      { product_id: 'prod-paneer', product_name: 'Amul Fresh Paneer 200g', quantity: 12, price: 85 }
    ],
    created_at: '2026-09-28T18:20:00Z'
  },
  {
    id: 'ord-hist-97',
    customer_id: 'USER00005',
    subtotal: 540,
    tax: 27,
    total_amount: 567,
    payment_method: 'UPI',
    payment_status: 'PAYMENT_SUCCESS',
    status: 'completed',
    items: [
      { product_id: 'prod-oliveoil', product_name: 'Figaro Extra Virgin Olive Oil 500ml', quantity: 1, price: 450 },
      { product_id: 'prod-pasta', product_name: 'Pasta (Borges) 500g Penne', quantity: 1, price: 60 }
    ],
    created_at: '2026-09-27T19:30:00Z'
  }
];

class DatabaseProvider {
  private state: DBState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadState();
    this.setupStorageSync();
  }

  private setupStorageSync() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
          this.state = this.loadState();
          this.notifyListeners();
        }
      });
      window.addEventListener('grocer_db_sync', () => {
        this.state = this.loadState();
        this.notifyListeners();
      });
    }
  }

  private loadState(): DBState {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: DBState = JSON.parse(saved);
          // Auto-migrate missing products
          for (const p of INITIAL_PRODUCTS) {
            if (!parsed.products.some(x => x.id === p.id)) {
              parsed.products.push(p);
            }
          }
          // Auto-migrate missing inventory
          for (const inv of INITIAL_INVENTORY) {
            if (!parsed.inventory.some(x => x.product_id === inv.product_id)) {
              parsed.inventory.push(inv);
            }
          }
          // Auto-migrate USER00002 mission
          if (!parsed.shoppingMissions.some(m => m.customer_id === 'USER00002')) {
            parsed.shoppingMissions.push(INITIAL_MISSION_USER2);
          }
          // Auto-migrate USER00002 session if missing
          if (!parsed.customerSessions.some(s => s.id === 'USER00002')) {
            parsed.customerSessions.push({
              id: 'USER00002',
              token: 'tok_user00002_live',
              created_at: '2026-09-28T18:00:00Z',
              last_active_at: '2026-09-28T18:45:00Z',
              status: 'active',
              device_type: 'SYNCED'
            });
          }
          // Auto-migrate USER00002 initial cart item if none exist
          if (!parsed.cartItems.some(c => c.customer_id === 'USER00002')) {
            const milkProd = parsed.products.find(p => p.id === 'prod-taaza-milk') || INITIAL_PRODUCTS[0];
            parsed.cartItems.push({
              id: 'cart-u2-1',
              customer_id: 'USER00002',
              product_id: 'prod-taaza-milk',
              product: milkProd,
              quantity: 2,
              added_at: '2026-09-28T19:05:00Z'
            });
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored DB state, resetting to initial defaults', e);
    }

    return {
      customerSessions: [
        { id: 'USER00001', token: 'tok_user00001_live', created_at: '2026-09-28T18:30:00Z', last_active_at: '2026-09-28T19:00:00Z', status: 'active', device_type: 'LARGE_DISPLAY' },
        { id: 'USER00002', token: 'tok_user00002_live', created_at: '2026-09-28T18:00:00Z', last_active_at: '2026-09-28T18:45:00Z', status: 'active', device_type: 'SYNCED' },
        { id: 'USER00003', token: 'tok_user00003_done', created_at: '2026-09-28T17:00:00Z', last_active_at: '2026-09-28T17:25:00Z', status: 'completed', device_type: 'LARGE_DISPLAY' },
        { id: 'USER00004', token: 'tok_user00004_abd', created_at: '2026-09-28T17:40:00Z', last_active_at: '2026-09-28T17:55:00Z', status: 'abandoned', device_type: 'LARGE_DISPLAY' }
      ],
      managerAccounts: [
        { employee_id: 'EMP-1042', dob: '1985-06-15', name: 'Vikram Malhotra', role: 'STORE_MANAGER', branch_id: 'BRANCH-104', branch_name: 'Indiranagar Flagship Superstore', last_login_at: '2026-09-28T18:00:00Z' },
        { employee_id: 'EMP-2088', dob: '1990-11-20', name: 'Priya Sharma', role: 'STORE_MANAGER', branch_id: 'BRANCH-104', branch_name: 'Indiranagar Flagship Superstore', last_login_at: '2026-09-27T09:30:00Z' }
      ],
      profiles: [
        {
          id: 'USER00001',
          name: 'Ishwarya Kota',
          role: 'CUSTOMER',
          language: 'en',
          email: 'customer@grocerai.internal',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          created_at: '2026-08-01T10:00:00Z'
        },
        {
          id: 'USER00002',
          name: 'Rahul Sen',
          role: 'CUSTOMER',
          language: 'en',
          email: 'rahul.sen@grocerai.internal',
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
          created_at: '2026-08-15T11:00:00Z'
        }
      ],
      customerPreferences: [
        {
          id: 'pref-1',
          customer_id: 'USER00001',
          dietary_preferences: ['Vegetarian', 'High-Protein', 'Low Carb'],
          budget_min: 200,
          budget_max: 1500,
          preferred_brands: ['Amul', 'Borges', 'Epigamia', 'OrganicTattva'],
          disliked_brands: [],
          voice_enabled: true,
          preferred_cuisine: ['Italian', 'North Indian', 'Mediterranean'],
          notifications_enabled: true,
          created_at: '2026-08-01T10:00:00Z'
        },
        {
          id: 'pref-2',
          customer_id: 'USER00002',
          dietary_preferences: ['Dairy-Lover', 'Organic'],
          budget_min: 150,
          budget_max: 1000,
          preferred_brands: ['Amul', 'Milky Mist', 'HealthFactory'],
          disliked_brands: [],
          voice_enabled: true,
          preferred_cuisine: ['Indian Breakfast'],
          notifications_enabled: true,
          created_at: '2026-08-15T11:00:00Z'
        }
      ],
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      inventory: INITIAL_INVENTORY,
      inventoryMovements: INITIAL_INVENTORY_MOVEMENTS,
      shoppingMissions: [INITIAL_MISSION, INITIAL_MISSION_USER2],
      cartItems: [
        { id: 'cart-1', customer_id: 'USER00001', product_id: 'prod-paneer', product: INITIAL_PRODUCTS[0], quantity: 1, added_at: '2026-09-28T18:50:00Z' },
        { id: 'cart-2', customer_id: 'USER00001', product_id: 'prod-tomatoes', product: INITIAL_PRODUCTS[1], quantity: 1, added_at: '2026-09-28T18:52:00Z' },
        { id: 'cart-3', customer_id: 'USER00001', product_id: 'prod-onions', product: INITIAL_PRODUCTS[2], quantity: 1, added_at: '2026-09-28T18:53:00Z' },
        { id: 'cart-4', customer_id: 'USER00001', product_id: 'prod-pasta', product: INITIAL_PRODUCTS[3], quantity: 1, added_at: '2026-09-28T18:55:00Z' },
        { id: 'cart-u2-1', customer_id: 'USER00002', product_id: 'prod-taaza-milk', product: INITIAL_PRODUCTS.find(p => p.id === 'prod-taaza-milk') || INITIAL_PRODUCTS[0], quantity: 2, added_at: '2026-09-28T19:05:00Z' }
      ],
      customerRequests: INITIAL_REQUESTS,
      substitutions: INITIAL_SUBSTITUTIONS,
      notifications: INITIAL_NOTIFICATIONS,
      payments: [
        { id: 'pay-1', order_id: 'ord-hist-99', customer_session_id: 'USER00003', amount: 285, payment_method: 'UPI', status: 'ORDER_CONFIRMED', transaction_ref: 'UPI/20260928/8892', created_at: '2026-09-28T17:18:00Z' },
        { id: 'pay-2', order_id: 'ord-hist-98', customer_session_id: 'USER00002', amount: 1071, payment_method: 'Card', status: 'ORDER_CONFIRMED', transaction_ref: 'CARD/AUTH/9921', created_at: '2026-09-28T18:20:00Z' }
      ],
      sales: [
        { id: 's-1', product_id: 'prod-paneer', product_name: 'Amul Fresh Paneer', category_name: 'Dairy', quantity: 42, unit_price: 85, total_amount: 3570, payment_method: 'UPI', order_id: 'ord-hist-98', created_at: '2026-09-28T14:30:00Z' },
        { id: 's-2', product_id: 'prod-pasta', product_name: 'Borges Whole Wheat Penne', category_name: 'Grains & Pasta', quantity: 18, unit_price: 60, total_amount: 1080, payment_method: 'Card', order_id: 'ord-hist-97', created_at: '2026-09-28T15:10:00Z' },
        { id: 's-3', product_id: 'prod-tomatoes', product_name: 'Farm Fresh Red Tomatoes', category_name: 'Fruits & Vegetables', quantity: 35, unit_price: 40, total_amount: 1400, payment_method: 'UPI', order_id: 'ord-hist-96', created_at: '2026-09-28T16:00:00Z' },
      ],
      events: INITIAL_HISTORICAL_EVENTS,
      storeEvents: [
        { id: 'ev-1', event_type: 'stockout', product_id: 'prod-paneer', product_name: 'Amul Fresh Paneer 200g', aisle: 'Aisle 4', severity: 'urgent', message: 'Paneer inventory reached 0 packs. 28 customer requests logged.', created_at: '2026-09-28T18:30:00Z' },
        { id: 'ev-2', event_type: 'low_stock', product_id: 'prod-tomatoes', product_name: 'Farm Fresh Red Tomatoes', aisle: 'Aisle 1', severity: 'medium', message: 'Tomatoes low stock warning: 5 packs remaining.', created_at: '2026-09-28T18:45:00Z' },
        { id: 'ev-3', event_type: 'queue_congestion', aisle: 'Checkout', severity: 'high', message: 'Counter 3 has 8 customers waiting (7 min wait). Recommended opening Counter 4.', created_at: '2026-09-28T18:55:00Z' },
      ],
      aisleTraffic: INITIAL_AISLE_TRAFFIC,
      checkoutQueues: INITIAL_CHECKOUT_QUEUES,
      aiRecommendations: INITIAL_AI_RECOMMENDATIONS,
      operationalActions: [
        {
          id: 'act-1',
          recommendation_id: 'rec-1',
          action_type: 'restock',
          description: 'Restocked 50 packs of Amul Fresh Paneer 200g to Aisle 4 Shelf B2',
          status: 'completed',
          approved_by: 'Vikram Malhotra',
          approved_at: 'Today, 10:00 AM',
          completed_at: 'Today, 10:15 AM',
          initial_state: { previous_stock: 0, added: 50 }
        }
      ],
      actionOutcomes: INITIAL_ACTION_OUTCOMES,
      customerMemories: INITIAL_CUSTOMER_MEMORIES,
      storeMemories: INITIAL_STORE_MEMORIES,
      orders: INITIAL_ORDERS
    };
  }

  private saveState() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        window.dispatchEvent(new Event('grocer_db_sync'));
      }
    } catch (e) {
      console.error('Failed to save DB state', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Listener error in db:', e);
      }
    }
  }

  public resetToDefaults() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.state = this.loadState();
    this.saveState();
  }

  // Getters
  public getProducts(): Product[] {
    return this.state.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.state.products.find(p => p.id === id);
  }

  public getCategories(): Category[] {
    return this.state.categories;
  }

  public getInventory(): InventoryItem[] {
    return this.state.inventory;
  }

  public getInventoryByProductId(productId: string): InventoryItem | undefined {
    return this.state.inventory.find(i => i.product_id === productId);
  }

  public getInventoryMovements(productId?: string): InventoryMovement[] {
    if (productId) {
      return this.state.inventoryMovements.filter(m => m.product_id === productId);
    }
    return this.state.inventoryMovements;
  }

  public getShoppingMissions(): ShoppingMission[] {
    return this.state.shoppingMissions;
  }

  public getActiveMission(customerId = 'USER00001'): ShoppingMission | undefined {
    let mission = this.state.shoppingMissions.find(m => m.customer_id === customerId && m.status === 'active');
    if (!mission) {
      mission = this.state.shoppingMissions.find(m => m.customer_id === customerId);
    }
    if (!mission) {
      mission = {
        id: `mission-${customerId.toLowerCase()}`,
        customer_id: customerId,
        name: `${customerId} Shopping Mission`,
        budget: 500,
        status: 'active',
        estimated_time_mins: 10,
        created_at: new Date().toISOString(),
        items: []
      };
      this.state.shoppingMissions.push(mission);
      this.saveState();
    }
    return mission;
  }

  public getCart(customerId = 'USER00001'): CartItem[] {
    return this.state.cartItems.filter(c => c.customer_id === customerId);
  }

  public getNotifications(customerId = 'USER00001'): NotificationItem[] {
    return this.state.notifications.filter(n => n.customer_id === customerId);
  }

  public getCustomerRequests(): CustomerRequest[] {
    return this.state.customerRequests;
  }

  public getSubstitutions(): SubstitutionRecord[] {
    return this.state.substitutions;
  }

  public getEvents(): HistoricalEvent[] {
    return this.state.events;
  }

  public getStoreEvents(): StoreEvent[] {
    return this.state.storeEvents;
  }

  public getAisleTraffic(): AisleTraffic[] {
    return this.state.aisleTraffic;
  }

  public getCheckoutQueues(): CheckoutQueue[] {
    return this.state.checkoutQueues;
  }

  public getAIRecommendations(): AIRecommendation[] {
    return this.state.aiRecommendations;
  }

  public addAIRecommendation(rec: AIRecommendation) {
    this.state.aiRecommendations.unshift(rec);
    this.saveState();
  }

  public getOperationalActions(): OperationalAction[] {
    return this.state.operationalActions;
  }

  public getActionOutcomes(): ActionOutcome[] {
    return this.state.actionOutcomes;
  }

  public addActionOutcome(outcome: ActionOutcome) {
    this.state.actionOutcomes.unshift(outcome);
    this.saveState();
  }

  public getCustomerMemories(customerId = 'USER00001'): CustomerMemoryInsight[] {
    return this.state.customerMemories.filter(m => m.customer_id === customerId);
  }

  public getStoreMemories(): StoreMemoryInsight[] {
    return this.state.storeMemories;
  }

  public getOrders(customerId?: string): Order[] {
    if (customerId) {
      return this.state.orders.filter(o => o.customer_id === customerId);
    }
    return this.state.orders;
  }

  public getSales(): SaleRecord[] {
    return this.state.sales;
  }

  public getPayments(): PaymentRecord[] {
    return this.state.payments;
  }

  public getCustomerPreferences(customerId = 'USER00001'): CustomerPreferences | undefined {
    return this.state.customerPreferences.find(p => p.customer_id === customerId);
  }

  // Mutators & Operations
  public addEvent(event: HistoricalEvent) {
    this.state.events.unshift(event);
    this.saveState();
  }

  public updateMissionItemStatus(missionId: string, itemId: string, status: 'found' | 'not_found' | 'in_progress' | 'pending') {
    const mission = this.state.shoppingMissions.find(m => m.id === missionId);
    if (mission) {
      const item = mission.items.find(i => i.id === itemId);
      if (item) {
        item.status = status;
        if (status === 'found') {
          item.found_at = new Date().toISOString();
          this.addEvent({
            event_id: `evt-${Date.now()}`,
            event_type: 'MISSION_ITEM_FOUND',
            customer_session_id: mission.customer_id,
            product_id: item.product_id,
            product_name: item.product_name,
            store_id: 'BRANCH-104',
            source: 'MOBILE',
            timestamp: new Date().toISOString()
          });
        }
        const allFound = mission.items.every(i => i.status === 'found');
        if (allFound) {
          mission.status = 'completed';
        }
        this.saveState();
      }
    }
  }

  public addToCart(product: Product, quantity = 1, customerId = 'USER00001', source: 'LARGE_DISPLAY' | 'MOBILE' = 'LARGE_DISPLAY'): CartItem {
    const existing = this.state.cartItems.find(c => c.customer_id === customerId && c.product_id === product.id);
    let item: CartItem;
    if (existing) {
      existing.quantity += quantity;
      item = existing;
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        customer_id: customerId,
        product_id: product.id,
        product: product,
        quantity: quantity,
        added_at: new Date().toISOString()
      };
      this.state.cartItems.push(newItem);
      item = newItem;
    }

    // Record behavioral event (Search/Intent ≠ Purchase)
    this.addEvent({
      event_id: `evt-${Date.now()}`,
      event_type: 'CART_ADD',
      customer_session_id: customerId,
      product_id: product.id,
      product_name: product.name,
      store_id: 'BRANCH-104',
      source: source,
      metadata: { quantity, price: product.price },
      timestamp: new Date().toISOString()
    });

    this.saveState();
    return item;
  }

  public updateCartItemQuantity(cartItemId: string, delta: number, customerId = 'USER00001') {
    const item = this.state.cartItems.find(c => c.id === cartItemId);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeCartItem(cartItemId, item.customer_id || customerId);
        return;
      }
      this.saveState();
    }
  }

  public removeCartItem(cartItemId: string, customerId = 'USER00001') {
    const item = this.state.cartItems.find(c => c.id === cartItemId);
    if (item) {
      const actualCustomerId = item.customer_id || customerId;
      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'CART_REMOVE',
        customer_session_id: actualCustomerId,
        product_id: item.product_id,
        product_name: item.product.name,
        store_id: 'BRANCH-104',
        source: 'LARGE_DISPLAY',
        timestamp: new Date().toISOString()
      });
      this.state.cartItems = this.state.cartItems.filter(c => c.id !== cartItemId);
      this.saveState();
    }
  }

  public clearCart(customerId = 'USER00001') {
    this.state.cartItems = this.state.cartItems.filter(c => c.customer_id !== customerId);
    this.saveState();
  }

  public recordCheckoutStarted(customerId = 'USER00001', source: 'LARGE_DISPLAY' | 'MOBILE' = 'LARGE_DISPLAY') {
    const cart = this.getCart(customerId);
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    this.addEvent({
      event_id: `evt-${Date.now()}`,
      event_type: 'CHECKOUT_STARTED',
      customer_session_id: customerId,
      store_id: 'BRANCH-104',
      source: source,
      metadata: { cartItemsCount: cart.length, subtotal },
      timestamp: new Date().toISOString()
    });
  }

  public recordCheckoutAbandoned(customerId = 'USER00001', reason = 'User navigated away') {
    this.addEvent({
      event_id: `evt-${Date.now()}`,
      event_type: 'CHECKOUT_ABANDONED',
      customer_session_id: customerId,
      store_id: 'BRANCH-104',
      source: 'LARGE_DISPLAY',
      metadata: { reason },
      timestamp: new Date().toISOString()
    });
  }

  public recordPaymentFailed(customerId = 'USER00001', paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash', reason: string) {
    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      customer_session_id: customerId,
      amount: 0,
      payment_method: paymentMethod,
      status: 'PAYMENT_FAILED',
      transaction_ref: `FAIL_${Date.now()}`,
      failure_reason: reason,
      created_at: new Date().toISOString()
    };
    this.state.payments.unshift(paymentRecord);

    this.addEvent({
      event_id: `evt-${Date.now()}`,
      event_type: 'PAYMENT_FAILED',
      customer_session_id: customerId,
      store_id: 'BRANCH-104',
      source: 'LARGE_DISPLAY',
      metadata: { paymentMethod, reason },
      timestamp: new Date().toISOString()
    });

    this.saveState();
  }

  public markNotificationRead(id: string) {
    const notif = this.state.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveState();
    }
  }

  public addNotification(notification: Omit<NotificationItem, 'id'>): NotificationItem {
    const newItem: NotificationItem = {
      id: `notif-${Date.now()}`,
      ...notification
    };
    this.state.notifications.unshift(newItem);
    this.saveState();
    return newItem;
  }

  public logCustomerRequest(requestText: string, product?: Product, customerId = 'USER00001', mode: 'voice' | 'chat' = 'voice') {
    const existing = this.state.customerRequests.find(r => r.product_name.toLowerCase() === (product?.name || requestText).toLowerCase());
    if (existing) {
      existing.request_count += 1;
      existing.created_at = new Date().toISOString();
    } else {
      const inv = product ? this.getInventoryByProductId(product.id) : null;
      const isUnavailable = !product || (inv?.quantity || 0) === 0;

      const req: CustomerRequest = {
        id: `req-${Date.now()}`,
        customer_id: customerId,
        customer_name: 'Customer ' + customerId,
        product_id: product?.id,
        product_name: product?.name || requestText,
        request_text: requestText,
        request_count: 1,
        created_at: new Date().toISOString(),
        status: isUnavailable ? 'unavailable' : 'fulfilled',
        mode: mode
      };
      this.state.customerRequests.unshift(req);

      // Record demand event
      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'PRODUCT_REQUEST',
        customer_session_id: customerId,
        product_id: product?.id,
        product_name: product?.name || requestText,
        store_id: 'BRANCH-104',
        source: 'LARGE_DISPLAY',
        metadata: { requestText, mode, status: req.status },
        timestamp: new Date().toISOString()
      });
    }
    this.saveState();
  }

  public recordSubstitution(sub: Omit<SubstitutionRecord, 'id' | 'timestamp'>): SubstitutionRecord {
    const newSub: SubstitutionRecord = {
      id: `sub-${Date.now()}`,
      ...sub,
      timestamp: new Date().toISOString()
    };
    this.state.substitutions.unshift(newSub);

    this.addEvent({
      event_id: `evt-${Date.now()}`,
      event_type: 'SUBSTITUTION_SUGGESTED',
      customer_session_id: sub.customer_session_id,
      product_id: sub.substitute_product_id,
      product_name: sub.substitute_product_name,
      store_id: 'BRANCH-104',
      source: 'LARGE_DISPLAY',
      metadata: { original: sub.requested_product_name, substitute: sub.substitute_product_name, accepted: sub.substitute_accepted },
      timestamp: new Date().toISOString()
    });

    this.saveState();
    return newSub;
  }

  public recordSubstitutionAccepted(subId: string, customerId = 'USER00001') {
    const sub = this.state.substitutions.find(s => s.id === subId);
    if (sub) {
      sub.substitute_accepted = true;
      const prod = this.getProductById(sub.substitute_product_id);
      if (prod) {
        this.addToCart(prod, sub.quantity || 1, customerId, 'LARGE_DISPLAY');
      }
      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'SUBSTITUTION_ACCEPTED',
        customer_session_id: customerId,
        product_id: sub.substitute_product_id,
        product_name: sub.substitute_product_name,
        store_id: 'BRANCH-104',
        source: 'LARGE_DISPLAY',
        metadata: { original: sub.requested_product_name, substitute: sub.substitute_product_name },
        timestamp: new Date().toISOString()
      });
      this.saveState();
    }
  }

  public recordSubstitutionRejected(subId: string, customerId = 'USER00001', reason = 'Customer declined') {
    const sub = this.state.substitutions.find(s => s.id === subId);
    if (sub) {
      sub.substitute_accepted = false;
      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'SUBSTITUTION_REJECTED',
        customer_session_id: customerId,
        product_id: sub.substitute_product_id,
        product_name: sub.substitute_product_name,
        store_id: 'BRANCH-104',
        source: 'LARGE_DISPLAY',
        metadata: { original: sub.requested_product_name, substitute: sub.substitute_product_name, reason },
        timestamp: new Date().toISOString()
      });
      this.saveState();
    }
  }

  public restockProduct(productId: string, quantityToAdd: number, reason = 'Manager approved restock') {
    const inv = this.state.inventory.find(i => i.product_id === productId);
    const prod = this.state.products.find(p => p.id === productId);
    if (inv) {
      const prevQty = inv.quantity;
      inv.quantity += quantityToAdd;
      inv.last_updated = new Date().toISOString();
      inv.status = inv.quantity > inv.reorder_threshold ? 'in_stock' : (inv.quantity > 0 ? 'low_stock' : 'out_of_stock');

      // Record immutable movement
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}`,
        product_id: productId,
        product_name: prod?.name,
        movement_type: 'RESTOCK',
        quantity_change: quantityToAdd,
        previous_quantity: prevQty,
        new_quantity: inv.quantity,
        reason,
        created_at: new Date().toISOString()
      };
      this.state.inventoryMovements.unshift(movement);

      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'INVENTORY_RESTOCK',
        product_id: productId,
        product_name: prod?.name,
        store_id: 'BRANCH-104',
        source: 'SYSTEM',
        metadata: { added: quantityToAdd, newTotal: inv.quantity, reason },
        timestamp: new Date().toISOString()
      });
    }
    this.saveState();
  }

  public approveRecommendation(recId: string): OperationalAction {
    const rec = this.state.aiRecommendations.find(r => r.id === recId);
    if (rec) {
      rec.status = 'approved';

      if (rec.type === 'restock' && rec.product_id) {
        const qtyMatch = rec.suggested_action.match(/Restock (\d+) packs/);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 50;
        this.restockProduct(rec.product_id, qty, `AI approved recommendation: ${rec.title}`);
      }

      if (rec.type === 'open_counter' && rec.target_counter) {
        this.updateCounterStatus(rec.target_counter, 'open');
      }

      const action: OperationalAction = {
        id: `act-${Date.now()}`,
        recommendation_id: rec.id,
        action_type: rec.type,
        description: `Approved: ${rec.suggested_action}`,
        status: 'completed',
        approved_by: 'Store Manager',
        approved_at: 'Just now',
        completed_at: 'Just now',
        initial_state: { recommendation: rec.title, impact: rec.expected_impact }
      };

      this.state.operationalActions.unshift(action);

      const outcome: ActionOutcome = {
        id: `out-${Date.now()}`,
        action_id: action.id,
        title: `${rec.title} Execution & Impact`,
        timestamp: 'Just now',
        observed_event: `AI identified bottleneck: ${rec.description}`,
        action_taken: `Manager approved recommendation: ${rec.suggested_action}`,
        reobserved_metric: `Target metrics adjusted positively: ${rec.expected_impact}`,
        outcome_summary: `System automatically adapted store state and verified resolution.`,
        satisfaction_delta: '+24% response efficiency',
        sales_delta: rec.expected_impact.includes('%') ? rec.expected_impact.split(' ')[0] : '+15% throughput',
        is_hindsight_stored: true,
        hindsight_id: `hs-store-mem-${Date.now()}`
      };
      this.state.actionOutcomes.unshift(outcome);

      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'OPERATIONAL_ACTION',
        store_id: 'BRANCH-104',
        source: 'SYSTEM',
        related_action_id: action.id,
        metadata: { title: rec.title, impact: rec.expected_impact },
        timestamp: new Date().toISOString()
      });

      this.saveState();
      return action;
    }
    throw new Error('Recommendation not found');
  }

  public modifyAndApproveRecommendation(recId: string, customQty?: number, customAction?: string): OperationalAction {
    const rec = this.state.aiRecommendations.find(r => r.id === recId);
    if (rec) {
      rec.status = 'approved';
      if (customAction) {
        rec.suggested_action = customAction;
      }
      const defaultQtyMatch = rec.suggested_action.match(/Restock (\d+) packs/);
      const qty = customQty ?? (defaultQtyMatch ? parseInt(defaultQtyMatch[1], 10) : 50);

      if (rec.type === 'restock' && rec.product_id) {
        this.restockProduct(rec.product_id, qty, `Manager modified & approved: ${rec.title} (+${qty} units)`);
      }

      if (rec.type === 'open_counter' && rec.target_counter) {
        this.updateCounterStatus(rec.target_counter, 'open');
      }

      const action: OperationalAction = {
        id: `act-${Date.now()}`,
        recommendation_id: rec.id,
        action_type: rec.type,
        description: `Modified & Approved: ${rec.suggested_action} (Qty: ${qty})`,
        status: 'completed',
        approved_by: 'Store Manager',
        approved_at: 'Just now',
        completed_at: 'Just now',
        initial_state: { recommendation: rec.title, impact: rec.expected_impact, modified_qty: qty }
      };

      this.state.operationalActions.unshift(action);

      const outcome: ActionOutcome = {
        id: `out-${Date.now()}`,
        action_id: action.id,
        title: `${rec.title} Execution (Modified)`,
        timestamp: 'Just now',
        observed_event: `AI recommendation adapted with custom parameters (${qty} units).`,
        action_taken: `Manager approved custom adjustment: ${action.description}`,
        reobserved_metric: `Inventory replenished with ${qty} units. Demand bottleneck cleared.`,
        outcome_summary: `System automatically updated shelf levels and verified replenishment.`,
        satisfaction_delta: '+25% response efficiency',
        sales_delta: '+20% throughput',
        is_hindsight_stored: true,
        hindsight_id: `hs-store-mem-${Date.now()}`
      };
      this.state.actionOutcomes.unshift(outcome);

      this.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'OPERATIONAL_ACTION',
        store_id: 'BRANCH-104',
        source: 'SYSTEM',
        related_action_id: action.id,
        metadata: { title: rec.title, modifiedQty: qty },
        timestamp: new Date().toISOString()
      });

      this.saveState();
      return action;
    }
    throw new Error('Recommendation not found');
  }

  public dismissRecommendation(recId: string) {
    const rec = this.state.aiRecommendations.find(r => r.id === recId);
    if (rec) {
      rec.status = 'dismissed';
      this.saveState();
    }
  }

  public updateCounterStatus(counterNumber: number, status: 'open' | 'closed' | 'congested') {
    const counter = this.state.checkoutQueues.find(q => q.counter_number === counterNumber);
    if (counter) {
      counter.status = status;
      if (status === 'open' && counter.customer_count === 0) {
        counter.customer_count = 1;
        counter.estimated_wait_mins = 1.0;
        counter.operator_name = 'Anil S. (Express)';
      }
      this.saveState();
    }
  }

  /**
   * CRITICAL REQUIREMENT (Section 5, 6, 7, 8, 9):
   * An order and sales records are ONLY created here AFTER successful payment.
   * Inventory is ONLY deducted here upon confirmed payment.
   */
  public completeCheckout(paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash', customerId = 'USER00001'): Order {
    const cart = this.getCart(customerId);
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    const orderId = `ord-${Date.now().toString().slice(-6)}`;

    // 1. Record Successful Payment
    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      order_id: orderId,
      customer_session_id: customerId,
      amount: total,
      payment_method: paymentMethod,
      status: 'PAYMENT_SUCCESS',
      transaction_ref: `${paymentMethod.toUpperCase()}_TXN_${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString()
    };
    this.state.payments.unshift(paymentRecord);

    // 2. Create Confirmed Order ONLY NOW
    const order: Order = {
      id: orderId,
      customer_id: customerId,
      subtotal,
      tax,
      total_amount: total,
      payment_method: paymentMethod,
      payment_status: 'PAYMENT_SUCCESS',
      status: 'completed',
      items: cart.map(c => ({
        product_id: c.product_id,
        product_name: c.product.name,
        quantity: c.quantity,
        price: c.product.price
      })),
      created_at: new Date().toISOString()
    };
    this.state.orders.unshift(order);

    // 3. Deduct Inventory & Record Inventory Movements & Sales
    for (const item of cart) {
      const inv = this.state.inventory.find(i => i.product_id === item.product_id);
      if (inv) {
        const prevQty = inv.quantity;
        inv.quantity = Math.max(0, inv.quantity - item.quantity);
        inv.last_updated = new Date().toISOString();
        if (inv.quantity === 0) inv.status = 'out_of_stock';
        else if (inv.quantity <= inv.reorder_threshold) inv.status = 'low_stock';

        // Record immutable inventory movement
        const movement: InventoryMovement = {
          id: `mov-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          product_name: item.product.name,
          movement_type: 'SALE',
          quantity_change: -item.quantity,
          previous_quantity: prevQty,
          new_quantity: inv.quantity,
          reason: `Customer confirmed purchase Order #${orderId}`,
          related_order_id: orderId,
          created_at: new Date().toISOString()
        };
        this.state.inventoryMovements.unshift(movement);
      }

      // Record Sales ONLY NOW
      const sale: SaleRecord = {
        id: `sale-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        product_name: item.product.name,
        category_name: item.product.category_name || 'Grocery',
        quantity: item.quantity,
        unit_price: item.product.price,
        total_amount: item.product.price * item.quantity,
        payment_method: paymentMethod,
        order_id: orderId,
        created_at: new Date().toISOString()
      };
      this.state.sales.unshift(sale);

      // Check if this item fulfills an accepted substitution
      const matchedSub = this.state.substitutions.find(s => s.substitute_product_id === item.product_id && s.substitute_accepted);
      if (matchedSub) {
        matchedSub.substitute_purchased = true;
        matchedSub.related_order_id = orderId;
      }
    }

    // 4. Record Events (Payment success, Order confirmed, Purchase completed)
    this.addEvent({
      event_id: `evt-${Date.now()}-1`,
      event_type: 'PAYMENT_SUCCESS',
      customer_session_id: customerId,
      store_id: 'BRANCH-104',
      source: 'LARGE_DISPLAY',
      related_order_id: orderId,
      metadata: { total, paymentMethod },
      timestamp: new Date().toISOString()
    });

    this.addEvent({
      event_id: `evt-${Date.now()}-2`,
      event_type: 'ORDER_CONFIRMED',
      customer_session_id: customerId,
      store_id: 'BRANCH-104',
      source: 'LARGE_DISPLAY',
      related_order_id: orderId,
      metadata: { orderId, total },
      timestamp: new Date().toISOString()
    });

    this.addEvent({
      event_id: `evt-${Date.now()}-3`,
      event_type: 'PURCHASE_COMPLETED',
      customer_session_id: customerId,
      store_id: 'BRANCH-104',
      source: 'LARGE_DISPLAY',
      related_order_id: orderId,
      metadata: { itemsCount: cart.length },
      timestamp: new Date().toISOString()
    });

    // 5. Clear cart
    this.clearCart(customerId);

    // 6. Mark mission items as found if they match
    const mission = this.getActiveMission(customerId);
    if (mission) {
      for (const cartItem of cart) {
        const mItem = mission.items.find(i => i.product_id === cartItem.product_id);
        if (mItem) {
          mItem.status = 'found';
          mItem.found_at = new Date().toISOString();
        }
      }
    }

    this.saveState();
    return order;
  }

  public updateCustomerPreferences(customerId: string, prefs: Partial<CustomerPreferences>) {
    const existing = this.state.customerPreferences.find(p => p.customer_id === customerId || customerId.startsWith('USER') && p.customer_id === 'USER00001');
    if (existing) {
      Object.assign(existing, prefs);
    } else {
      this.state.customerPreferences.push({
        id: `pref-${Date.now()}`,
        customer_id: customerId,
        dietary_preferences: prefs.dietary_preferences || [],
        budget_min: prefs.budget_min || 0,
        budget_max: prefs.budget_max || 2000,
        preferred_brands: prefs.preferred_brands || [],
        disliked_brands: prefs.disliked_brands || [],
        voice_enabled: prefs.voice_enabled ?? true,
        notifications_enabled: prefs.notifications_enabled ?? true,
        preferred_cuisine: prefs.preferred_cuisine || [],
        created_at: new Date().toISOString()
      });
    }
    this.saveState();
  }
}

export const db = new DatabaseProvider();
