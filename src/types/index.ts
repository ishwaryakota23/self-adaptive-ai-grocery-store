export type UserRole = 'CUSTOMER' | 'STORE_MANAGER';
export type LanguageCode = 'en' | 'te' | 'hi';
export type InteractionMode = 'voice' | 'chat' | 'browse';

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  name: string;
  role: UserRole;
  language: LanguageCode;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface CustomerSession {
  id: string; // e.g. "USER00001"
  token: string;
  created_at: string;
  last_active_at: string;
  status: 'active' | 'completed' | 'abandoned';
  device_type: 'LARGE_DISPLAY' | 'MOBILE' | 'SYNCED';
  metadata?: Record<string, any>;
}

export interface ManagerAccount {
  employee_id: string; // e.g. "EMP-1042"
  dob: string; // "YYYY-MM-DD" e.g. "1985-06-15"
  name: string;
  role: 'STORE_MANAGER' | 'ADMIN';
  branch_id: string;
  branch_name: string;
  last_login_at?: string;
}

export interface CustomerPreferences {
  id: string;
  customer_id: string;
  dietary_preferences: string[]; // e.g. Vegetarian, Gluten-Free, Vegan, High-Protein
  budget_min: number;
  budget_max: number;
  preferred_brands: string[];
  disliked_brands: string[];
  voice_enabled: boolean;
  preferred_cuisine?: string[];
  notifications_enabled: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  weight_or_volume: string;
  image_url: string;
  aisle: string;
  shelf_location: string;
  nutrition: {
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
    serving_size?: string;
  };
  tags: string[];
  rating: number;
  reviews_count: number;
  is_organic?: boolean;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  reorder_threshold: number;
  last_updated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  max_capacity: number;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name?: string;
  movement_type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
  quantity_change: number; // e.g. -2 or +50
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  related_order_id?: string;
  created_at: string;
}

export interface ShoppingMissionItem {
  id: string;
  mission_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'found' | 'not_found';
  aisle: string;
  shelf_location?: string;
  found_at?: string;
  alternative_product_id?: string;
}

export interface ShoppingMission {
  id: string;
  customer_id: string; // can be USER00001 session ID
  name: string;
  budget: number;
  status: 'active' | 'completed' | 'abandoned';
  items: ShoppingMissionItem[];
  created_at: string;
  estimated_time_mins: number;
}

export interface CartItem {
  id: string;
  customer_id: string; // mapped to customer session ID (e.g. USER00001)
  product_id: string;
  product: Product;
  quantity: number;
  added_at: string;
}

export interface CustomerRequest {
  id: string;
  customer_id: string;
  customer_name?: string;
  product_id?: string;
  product_name: string;
  request_text: string;
  request_count: number;
  created_at: string;
  status: 'fulfilled' | 'pending' | 'unavailable';
  mode: 'voice' | 'chat';
}

export interface SubstitutionRecord {
  id: string;
  customer_session_id: string;
  requested_product_name: string;
  requested_product_available: boolean;
  substitute_product_id: string;
  substitute_product_name: string;
  substitute_suggested: boolean;
  substitute_accepted: boolean;
  substitute_purchased: boolean;
  related_order_id?: string;
  quantity: number;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  customer_id: string;
  type: 'product_found' | 'low_stock' | 'unavailable' | 'alternative' | 'nearby_offer' | 'navigation' | 'queue_alert';
  title: string;
  message: string;
  product_id?: string;
  product_name?: string;
  aisle?: string;
  read: boolean;
  created_at: string;
  audio_url?: string;
  actions: {
    type: 'play_voice' | 'view_location' | 'mark_found' | 'reserve' | 'view_deal' | 'suggest_alternative';
    label: string;
    route?: string;
  }[];
}

export type PaymentStatus =
  | 'CART'
  | 'CHECKOUT'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ORDER_CONFIRMED'
  | 'CANCELLED';

export interface PaymentRecord {
  id: string;
  order_id?: string;
  customer_session_id: string;
  amount: number;
  payment_method: 'UPI' | 'Card' | 'Wallet' | 'Cash';
  status: PaymentStatus;
  transaction_ref: string;
  failure_reason?: string;
  created_at: string;
}

export interface SaleRecord {
  id: string;
  product_id: string;
  product_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'UPI' | 'Card' | 'Wallet' | 'Cash';
  order_id?: string;
  created_at: string;
}

export interface StoreEvent {
  id: string;
  event_type: 'stockout' | 'low_stock' | 'traffic_spike' | 'queue_congestion' | 'repeated_request' | 'price_change' | 'operational_action';
  product_id?: string;
  product_name?: string;
  aisle?: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type EventType =
  | 'PRODUCT_SEARCH'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_DETAIL_VIEW'
  | 'AVAILABILITY_CHECK'
  | 'PRODUCT_REQUEST'
  | 'RECOMMENDATION_VIEWED'
  | 'RECOMMENDATION_ACCEPTED'
  | 'RECOMMENDATION_REJECTED'
  | 'SUBSTITUTION_SUGGESTED'
  | 'SUBSTITUTION_ACCEPTED'
  | 'SUBSTITUTION_REJECTED'
  | 'CART_ADD'
  | 'CART_REMOVE'
  | 'CHECKOUT_STARTED'
  | 'CHECKOUT_ABANDONED'
  | 'PAYMENT_ATTEMPT'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ORDER_CONFIRMED'
  | 'PURCHASE_COMPLETED'
  | 'MISSION_ITEM_FOUND'
  | 'MISSION_ITEM_NOT_FOUND'
  | 'NAVIGATION_STARTED'
  | 'NOTIFICATION_ACTION'
  | 'INVENTORY_RESTOCK'
  | 'INVENTORY_DEDUCTION'
  | 'QUEUE_CONGESTION'
  | 'OPERATIONAL_ACTION'
  | 'VOICE_INPUT'
  | 'TEXT_INPUT'
  | 'LANGUAGE_DETECTED'
  | 'AGENT_REQUEST'
  | 'AGENT_RESPONSE'
  | 'TTS_REQUEST'
  | 'TTS_SUCCESS'
  | 'TTS_FAILED'
  | 'STORE_AGENT_OBSERVATION'
  | 'STORE_AGENT_RECOMMENDATION_CREATED'
  | 'STORE_AGENT_RECOMMENDATION_APPROVED'
  | 'STORE_AGENT_RECOMMENDATION_MODIFIED'
  | 'STORE_AGENT_RECOMMENDATION_DISMISSED'
  | 'STORE_AGENT_ACTION_EXECUTED'
  | 'STORE_AGENT_OUTCOME_RECORDED';

export interface HistoricalEvent {
  event_id: string;
  event_type: EventType;
  customer_session_id?: string;
  product_id?: string;
  product_name?: string;
  store_id: string;
  source: 'LARGE_DISPLAY' | 'MOBILE' | 'SYSTEM';
  related_order_id?: string;
  related_action_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AisleTraffic {
  id: string;
  aisle: string;
  aisle_name: string;
  customer_count: number;
  density: 'low' | 'moderate' | 'high' | 'critical';
  peak_hours: string;
  avg_dwell_time_mins: number;
  recorded_at: string;
}

export interface CheckoutQueue {
  id: string;
  counter_number: number;
  customer_count: number;
  estimated_wait_mins: number;
  status: 'open' | 'closed' | 'congested';
  operator_name?: string;
  recorded_at: string;
}

export type StoreRecommendationType =
  | 'RESTOCK'
  | 'STOCKOUT'
  | 'UNFULFILLED_DEMAND'
  | 'DEMAND_SPIKE'
  | 'QUEUE'
  | 'AISLE_ACTIVITY'
  | 'SUBSTITUTION'
  | 'OTHER_OPERATIONAL';

export interface StructuredRecommendation {
  recommendationId: string;
  type: StoreRecommendationType | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  productId?: string;
  productName?: string;
  reason: string;
  evidence: string[];
  suggestedAction: string;
  suggestedQuantity?: number;
  status: 'PENDING' | 'APPROVED' | 'DISMISSED' | 'MODIFIED';
  createdAt: string;
  relatedEvents?: string[];
  confidence?: number;
}

export interface AIRecommendation {
  id: string;
  type: 'restock' | 'open_counter' | 'discount' | 'relocate' | string;
  title: string;
  description: string;
  product_id?: string;
  product_name?: string;
  target_counter?: number;
  suggested_action: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expected_impact: string;
  historical_evidence: string;
  status: 'pending' | 'approved' | 'dismissed' | 'modified';
  created_at: string;
  evidence?: string[];
  suggested_quantity?: number;
}

export interface StoreOverview {
  totalProducts: number;
  totalInventoryUnits: number;
  lowStockProductsCount: number;
  outOfStockProductsCount: number;
  inventoryValue: number;
  storeStatus: 'OPTIMAL' | 'ATTENTION_REQUIRED' | 'CRITICAL_STOCKOUTS';
  recentOperationalEvents: HistoricalEvent[];
  congestedQueuesCount: number;
  activeRecommendationsCount: number;
}

export interface StoreAgentRequest {
  input: string;
  managerId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface StoreAgentResponse {
  success: boolean;
  groqConfigured: boolean;
  message: string;
  intent?: string;
  recommendations?: StructuredRecommendation[];
  toolExecutions?: Array<{ tool_name: string; success: boolean; result: any; error?: string }>;
  suggestedActions?: Array<{ label: string; action: string; recommendationId?: string; payload?: any }>;
  recalledMemories?: string[];
  error?: string;
}

export interface OperationalAction {
  id: string;
  recommendation_id?: string;
  action_type: string;
  description: string;
  status: 'dispatched' | 'in_progress' | 'completed';
  approved_by: string;
  approved_at: string;
  completed_at?: string;
  initial_state: Record<string, any>;
}

export interface ActionOutcome {
  id: string;
  action_id: string;
  title: string;
  timestamp: string;
  observed_event: string;
  action_taken: string;
  reobserved_metric: string;
  outcome_summary: string;
  satisfaction_delta: string;
  sales_delta: string;
  is_hindsight_stored: boolean;
  hindsight_id?: string;
}

export interface CustomerMemoryInsight {
  id: string;
  customer_id: string;
  type: 'preference' | 'habit' | 'recipe' | 'frequency';
  title: string;
  description: string;
  tag: string;
  confidence: number;
  first_observed: string;
  last_reinforced: string;
  times_applied: number;
}

export interface StoreMemoryInsight {
  id: string;
  type: 'stockout_pattern' | 'rush_hour' | 'demand_surge' | 'seasonal' | 'price_elasticity';
  title: string;
  observation: string;
  consequence: string;
  learned_rule: string;
  confidence: number;
  recorded_at: string;
  is_hindsight_synced: boolean;
}

export interface Order {
  id: string;
  customer_id: string; // mapped to customer session ID (e.g. USER00001)
  total_amount: number;
  subtotal: number;
  tax: number;
  payment_method: 'UPI' | 'Card' | 'Wallet' | 'Cash';
  payment_status: 'PAYMENT_SUCCESS';
  status: 'completed' | 'processing' | 'cancelled';
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }[];
  created_at: string;
}

export interface DemandFunnelSummary {
  searches: number;
  views: number;
  cartAdditions: number;
  checkoutAttempts: number;
  confirmedSales: number;
  unfulfilledDemand: number;
}
