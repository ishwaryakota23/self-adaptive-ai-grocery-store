export type UserRole = 'CUSTOMER' | 'EMPLOYEE' | 'STORE_MANAGER';
export type LanguageCode = 'en' | 'te' | 'hi';
export type InteractionMode = 'voice' | 'chat' | 'browse';

// ==========================================
// 1. CORE CUSTOMER IDENTITY & SHOPPING SESSION
// ==========================================

export interface Customer {
  customer_id: string; // e.g. "CUST-1001"
  email?: string; // Primary communication gateway
  email_verified_at?: string;
  whatsapp_number?: string; // Optional legacy / extensible channel
  name: string;
  language: LanguageCode;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomerIdentityToken {
  token_id: string;
  customer_id: string;
  secure_token: string; // signed/opaque token for QR e.g. "CID_SEC_..."
  qr_payload: string;
  status: 'active' | 'revoked' | 'expired';
  delivered_via_email?: boolean;
  delivered_via_whatsapp?: boolean;
  created_at: string;
  updated_at: string;
  revoked_at?: string;
  expires_at?: string;
}

export type SessionLifecycleStatus =
  | 'SHOPPING'
  | 'CHECKOUT_REQUESTED'
  | 'WAITING_FOR_KIOSK'
  | 'KIOSK_IDENTIFIED'
  | 'VERIFICATION_IN_PROGRESS'
  | 'VERIFICATION_PASSED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'ORDER_COMPLETED'
  | 'DEMO_COMPLETED'
  | 'MISMATCH_DETECTED'
  | 'EMPLOYEE_VERIFICATION'
  | 'CONFIRMED_INCIDENT';

export interface ShoppingSession {
  session_id: string; // e.g. "SESS-5001"
  customer_id: string; // references Customer
  device_type: 'KIOSK' | 'MOBILE' | 'SYNCED' | 'LARGE_DISPLAY';
  status: 'active' | 'completed' | 'abandoned';
  lifecycle_status?: SessionLifecycleStatus;
  assigned_kiosk_id?: string;
  interaction_mode: InteractionMode;
  started_at: string;
  last_activity_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

export interface Cart {
  cart_id: string; // e.g. "CART-9001"
  session_id: string; // references ShoppingSession
  customer_id: string; // references Customer
  status: 'active' | 'checked_out' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface SessionHandoff {
  handoff_id: string;
  session_id: string;
  customer_id: string;
  secure_token: string; // e.g. "SQ_HANDOFF_..."
  qr_payload: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  used_at?: string;
  cart_snapshot?: CartItem[];
  customer_snapshot?: Customer;
}

// Security Agent Event Model
export type SecurityEventType =
  | 'INVALID_CUSTOMER_QR'
  | 'EXPIRED_CUSTOMER_QR'
  | 'REVOKED_CUSTOMER_QR'
  | 'INVALID_SESSION_QR'
  | 'EXPIRED_SESSION_QR'
  | 'SESSION_MISMATCH'
  | 'CROSS_CUSTOMER_ACCESS_ATTEMPT'
  | 'CROSS_CUSTOMER_ACCESS_VIOLATION'
  | 'CROSS_CUSTOMER_SESSION_HIJACK'
  | 'CROSS_CUSTOMER_HIJACK_ATTEMPT'
  | 'SESSION_HIJACK_ATTEMPT'
  | 'OTP_RATE_LIMIT_EXCEEDED'
  | 'OTP_MAX_ATTEMPTS_EXCEEDED'
  | 'MANAGER_AUTH_FAILURE'
  | 'UNAUTHORIZED_MANAGER_ACCESS'
  | 'CART_MANIPULATION'
  | 'CART_TAMPER_DETECTED'
  | 'QUANTITY_TAMPER_DETECTED'
  | 'CHECKOUT_QUANTITY_MISMATCH'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DUPLICATE_PAYMENT_ATTEMPT'
  | 'PAYMENT_FAILURE'
  | 'PRICE_MISMATCH'
  | 'UNAUTHORIZED_ACCESS'
  | 'SECURITY_AUDIT_PASS'
  | 'CONCURRENT_PURCHASE_CONTENTION'
  | 'AMBIGUOUS_ANOMALY_ESCALATED'
  | 'FALSE_POSITIVE_RESOLVED'
  | 'BENIGN_BEHAVIOR_VERIFIED'
  // CCTV & Surveillance Scenarios
  | 'NORMAL_SHOPPING_ACTIVITY'
  | 'HIGH_AISLE_TRAFFIC'
  | 'UNUSUAL_REPEATED_SHELF_ACTIVITY'
  | 'POSSIBLE_PRODUCT_CONCEALMENT'
  | 'REPEATED_PRODUCT_CONCEALMENT'
  | 'SAFETY_DISTURBANCE'
  | 'AGGRESSIVE_INCIDENT'
  | 'ELECTRICAL_HAZARD'
  | 'POWER_OUTAGE'
  | 'LONG_DURATION_POWER_OUTAGE';

// CCTV Surveillance Manifest & Player Models
export interface CCTVTimelineStage {
  time: string; // e.g. "00:08"
  timestamp: string; // e.g. "11:17:08"
  stage: string; // e.g. "SHELF_APPROACH"
  action: string;
  status: 'OBSERVED' | 'DETECTED' | 'FLAGGED' | 'ESCALATED' | 'NORMAL' | 'CRITICAL' | 'ACTION_REQUIRED';
}

export interface CCTVVideoEntry {
  video_id: string;
  file_path: string;
  file_name: string;
  camera_id: string;
  camera_label: string;
  scenario_type: string;
  scenario_title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expected_event: SecurityEventType;
  description: string;
  email_required: boolean;
  operational_impact: boolean;
  store_impact?: string;
  evidence_frame_url?: string;
  temporal_timeline: CCTVTimelineStage[];
  security_reasoning: string;
  recommended_action: string;
  confidence?: number;
}

export interface CCTVCameraStatus {
  camera_id: string;
  name: string;
  location: string;
  status: 'NORMAL' | 'MONITORING' | 'WARNING' | 'HIGH_ALERT' | 'CRITICAL';
  active_video_id?: string;
  last_event?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  customer_id?: string;
  session_id?: string;
  order_id?: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
  digital_quantity?: number;
  physical_quantity?: number;
  inventory_state?: number;
  expected_inventory_after?: number;
  triggering_rule?: string;
  recommendedAction?: string;
  resolution?: string;
  resolved_at?: string;
  isFalsePositive?: boolean;
  investigationNote?: string;
  emailDispatched?: boolean;
}

// Physical Checkout Observation & 3-Source Comparison Models
export interface PhysicalBasketItem {
  product_id: string;
  product_name: string;
  observed_quantity: number;
  confidence: number;
  bounding_box?: { x: number; y: number; w: number; h: number };
}

export interface PhysicalCheckoutObservation {
  observation_id: string;
  session_id: string;
  camera_id: string;
  observed_at: string;
  items: PhysicalBasketItem[];
}

export interface CheckoutComparisonItem {
  product_id: string;
  sku_id?: string;
  barcode?: string;
  pack_size?: string;
  product_name: string;
  digital_quantity: number;
  physical_quantity: number;
  verified_quantity?: number;
  remaining_quantity?: number;
  current_inventory: number;
  expected_inventory_after_sale: number;
  status: 'MATCH' | 'DISCREPANCY_OVER_PHYSICAL' | 'DISCREPANCY_UNDER_PHYSICAL' | 'STOCK_INSUFFICIENT' | 'PACK_SIZE_MISMATCH' | 'UNBILLED_ITEM';
  difference: number;
  discrepancy?: number;
  scanned_sku?: string;
  scanned_barcode?: string;
  scanned_pack_size?: string;
  mismatch_note?: string;
}

export interface CheckoutVerificationResult {
  verified: boolean;
  passed?: boolean;
  comparison: CheckoutComparisonItem[];
  hasDiscrepancy: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  customerAlert?: {
    severity: 'low' | 'medium' | 'high';
    title?: string;
    message: string;
    actionable_options: Array<'correct_cart' | 'return_item' | 'request_staff'>;
  };
  managerAlert?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    discrepancyCount: number;
    recommendedAction: string;
    emailDispatched?: boolean;
    eventId?: string;
  };
  securityEventId?: string;
  recalledSecurityHindsight?: Array<{ pattern: string; resolution: string; takeaway: string }>;
  recalledHindsightInsight?: string;
}

export interface ManagerAction {
  id: string;
  manager_id: string;
  action_type: 'APPROVE_RECOMMENDATION' | 'DISMISS_RECOMMENDATION' | 'MODIFY_RECOMMENDATION' | 'RESTOCK_OVERRIDE' | 'COUNTER_OVERRIDE' | 'SECURITY_DISMISSAL' | string;
  target_id: string;
  details: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  name: string;
  role: UserRole;
  language: LanguageCode;
  email: string;
  avatar_url?: string;
  created_at: string;
  whatsapp_number?: string;
}

export interface CustomerSession {
  id: string; // e.g. "USER00001"
  token: string;
  created_at: string;
  last_active_at: string;
  status: 'active' | 'completed' | 'abandoned';
  device_type: 'LARGE_DISPLAY' | 'MOBILE' | 'SYNCED' | 'KIOSK';
  metadata?: Record<string, any>;
  customer_id?: string;
}

export interface ManagerAccount {
  employee_id: string; // e.g. "EMP-1042"
  dob: string; // "YYYY-MM-DD" e.g. "1985-06-15"
  name: string;
  phone?: string; // e.g. "9618633599"
  presence?: 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC';
  role: 'STORE_MANAGER' | 'ADMIN';
  branch_id: string;
  branch_name: string;
  last_login_at?: string;
}

// ==========================================
// 1B. EMPLOYEE IDENTITY & OPERATIONAL CONSOLE
// ==========================================

export interface EmployeeAccount {
  employee_id: string; // Unique, e.g. "EMP-1047"
  dob: string; // "YYYY-MM-DD" e.g. "1994-08-22"
  name: string;
  role: string; // e.g. "Exit Verification Officer", "Security Responder", "Floor Associate", "Inventory Specialist"
  department: string; // "Operations", "Security & Loss Prevention", "Inventory", "Customer Service"
  email?: string;
  qr_token: string; // Distinct token format e.g. "GROCERAI_EMP_V1:EMP-1047:..."
  registered_at: string;
  last_login_at?: string;
  status: 'active' | 'suspended' | 'on_leave';
}

export interface EmployeeAttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  department: string;
  timestamp: string; // ISO
  time_display: string; // e.g. "19:42"
  location: string; // e.g. "KIOSK-MAIN-ENTRANCE-01", "STATION-EXIT-01"
  status: 'PRESENT' | 'CHECKED_OUT';
  verified_method: 'QR_SCAN' | 'MOBILE_AUTH' | 'MANUAL';
}

export interface EmployeeSession {
  session_id: string;
  employee_id: string;
  started_at: string;
  last_active_at: string;
  location: string;
  status: 'active' | 'ended';
}

export interface EmployeeSecurityResolution {
  id: string;
  eventId: string;
  employeeId: string;
  employeeName: string;
  action: 'FALSE_POSITIVE' | 'CONFIRMED_INCIDENT' | 'BENIGN_CORRECTION';
  notes: string;
  timestamp: string;
  hindsightDocumentId?: string;
}

export interface EmployeeOperationsSummary {
  employeesPresent: number;
  totalEmployees: number;
  securityEventsToday: number;
  resolved: number;
  pending: number;
  falsePositives: number;
  confirmedIncidents: number;
  averageResponseTimeSec: number;
  activeEmployees: Array<{
    employee_id: string;
    name: string;
    role: string;
    department: string;
    location: string;
    status: string;
    eventsHandledCount: number;
  }>;
  recommendation?: {
    title: string;
    description: string;
    urgency: 'high' | 'medium' | 'low';
    action: string;
  };
  roster?: Array<any>;
  staffingRecommendation?: string;
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
  sku_id?: string; // Authoritative SKU identity e.g. "CHEESE_200G"
  barcode?: string; // Physical barcode e.g. "8901262010029"
  category_id: string;
  category_name?: string;
  name: string;
  brand: string;
  variant?: string; // Variant e.g. "Processed Block", "Toned", "Chakki Whole Wheat"
  pack_size?: string; // Explicit pack size e.g. "200g", "100g", "1L", "500ml", "1kg", "5kg"
  pack_unit?: string; // Unit e.g. "g", "ml", "kg", "L"
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
  unit?: string;
}

// Authoritative Barcode / SKU Resolution Result
export interface BarcodeResolutionResult {
  barcode: string;
  found: boolean;
  product?: Product;
  sku_id?: string;
  pack_size?: string;
  variant?: string;
  price?: number;
  error?: string;
}

// Item-by-item verification scan record at checkout kiosk
export interface ItemVerificationScanRecord {
  scan_id: string;
  timestamp: string;
  scanned_barcode: string;
  scanned_sku: string;
  scanned_product_name: string;
  scanned_pack_size: string;
  target_cart_sku: string;
  target_cart_pack_size: string;
  match: boolean;
  mismatch_type?: 'PACK_SIZE_MISMATCH' | 'WRONG_PRODUCT' | 'UNBILLED_ITEM' | 'QUANTITY_EXCEEDED' | 'BARCODE_UNREADABLE';
  cv_confidence: number;
  message: string;
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
  cart_id?: string;
  session_id?: string;
  customer_id: string; // mapped to customer session ID or customer ID
  product_id: string;
  product: Product;
  quantity: number;
  price_snapshot?: number;
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
  original_product_id?: string;
  suggested_product_id?: string;
  accepted?: boolean;
}

export interface NotificationItem {
  id: string;
  customer_id?: string;
  type: 'product_found' | 'low_stock' | 'unavailable' | 'alternative' | 'nearby_offer' | 'navigation' | 'queue_alert' | 'security_alert' | 'system_alert';
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
  session_id?: string;
  customer_id?: string;
  amount: number;
  payment_method: 'UPI' | 'Card' | 'Wallet' | 'Cash';
  status: PaymentStatus;
  transaction_ref: string;
  provider?: string;
  idempotency_key?: string;
  metadata?: Record<string, any>;
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
  session_id?: string;
  customer_id?: string;
  created_at: string;
  sold_at?: string;
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
  | 'STORE_AGENT_OUTCOME_RECORDED'
  | 'PRODUCT_STOCKOUT'
  | 'LOW_STOCK_DETECTED'
  | 'PRODUCT_RESTOCKED'
  | 'PRODUCT_OVERSTOCKED'
  | 'PRODUCT_WASTAGE'
  | 'CUSTOMER_REQUEST_UNFULFILLED'
  | 'REPEATED_PRODUCT_REQUEST'
  | 'DEMAND_SPIKE'
  | 'DEMAND_DROP'
  | 'CHECKOUT_QUEUE_INCREASED'
  | 'RESTOCK_OUTCOME'
  | 'MANAGER_APPROVED'
  | 'MANAGER_MODIFIED'
  | 'MANAGER_DISMISSED'
  | 'RECOMMENDATION_SUCCESS'
  | 'RECOMMENDATION_FAILURE'
  | 'UNFULFILLED_DEMAND';

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
  kiosk_id?: string; // e.g. "KIOSK-01"
  kiosk_name?: string; // e.g. "Verification Kiosk 1"
  customer_count: number;
  estimated_wait_mins: number;
  status: 'open' | 'closed' | 'congested';
  operator_name?: string;
  verification_throughput_per_hr?: number;
  recorded_at: string;
}

export type StoreRecommendationType =
  | 'RESTOCK'
  | 'OVERSTOCK'
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
  currentFacts?: string[];
  historicalContext?: string[];
  expectedBenefit?: string;
  downsideRisk?: string;
  estimatedImpact?: string;
}

export interface AIRecommendation {
  id: string;
  type: 'restock' | 'open_counter' | 'discount' | 'relocate' | 'overstock' | string;
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
  current_facts?: string[];
  historical_context?: string[];
  expected_benefit?: string;
  downside_risk?: string;
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
  evidence_source?: 'verified-operation' | 'synthetic-demo' | 'unverified';
  roi_report?: RecommendationRoiReport;
  net_impact?: number;
  roi_classification?: RoiMetricClassification;
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
  order_id?: string;
  customer_id: string; // mapped to customer ID or session ID
  session_id?: string;
  cart_id?: string;
  total_amount: number;
  subtotal?: number;
  tax?: number;
  payment_method?: 'UPI' | 'Card' | 'Wallet' | 'Cash';
  payment_status: 'PAYMENT_SUCCESS' | 'PAID' | 'COMPLETED';
  status?: 'completed' | 'processing' | 'cancelled';
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }[];
  created_at: string;
  completed_at?: string;
}

export interface DemandFunnelSummary {
  searches: number;
  views: number;
  cartAdditions: number;
  checkoutAttempts: number;
  confirmedSales: number;
  unfulfilledDemand: number;
}

// ==========================================
// ROI ENGINE & BUSINESS IMPACT TYPES
// ==========================================
export type RoiMetricClassification = 'ACTUAL' | 'ESTIMATED' | 'PROJECTED';
export type RoiDataConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface RoiMetricResult {
  metricName: string;
  classification: RoiMetricClassification;
  value: number; // 0 if unavailable or insufficient data
  formattedValue: string; // e.g., "₹1,240" or "+22%" or "ROI unavailable — insufficient cost data"
  formula: string;
  inputs: Record<string, any>;
  calculatedAt: string;
  confidence: RoiDataConfidence;
  dataPeriod: string;
  isSufficientData: boolean;
  statusNote?: string;
  unit?: 'INR' | 'PERCENT' | 'UNITS';
}

export interface RecommendationRoiReport {
  recommendationId: string;
  actionId?: string;
  outcomeId?: string;
  productId?: string;
  productName?: string;
  timestamp: string;
  metrics: {
    salesOpportunityPreserved?: RoiMetricResult;
    wastageReduced?: RoiMetricResult;
    demandFulfillment?: RoiMetricResult;
    inventoryHoldingImpact?: RoiMetricResult;
    operationalCost?: RoiMetricResult;
    netBusinessImpact?: RoiMetricResult;
  };
  classification: RoiMetricClassification;
  grossBenefit: number;
  totalCost: number;
  netImpact: number;
  isNetPositive: boolean;
  summary: string;

  // Explicit Self-Adaptive Closed Loop ROI Attributes (Expected ≠ Realized)
  expectedBenefit?: number;
  expectedBenefitFormatted?: string;
  decisionCost?: number;
  decisionCostFormatted?: string;
  actualOutcomeMetric?: string;
  realizedImpact?: number;
  realizedImpactFormatted?: string;
  isRealizedComputed?: boolean;
  discrepancyNote?: string;
}

export interface BusinessImpactSummary {
  period: string;
  totalSalesOpportunityPreserved: RoiMetricResult;
  totalWastageReduced: RoiMetricResult;
  overallDemandFulfillmentImprovement: RoiMetricResult;
  totalInventoryHoldingSavings: RoiMetricResult;
  totalOperationalCost: RoiMetricResult;
  netBusinessImpact: RoiMetricResult;
  activeReportsCount: number;
  lastUpdated: string;
}

// ==========================================
// REMOTE MULTI-TERMINAL KIOSK STATE
// ==========================================
export type RemoteKioskStatus = 'ACTIVE' | 'STANDBY' | 'ACTIVATING';

export interface RemoteKioskActivationEvent {
  kioskId: string;
  status: 'ACTIVE';
  requestedBy: string;
  commandSource: string;
  timestamp: string;
  message: string;
}

export interface RemoteKioskState {
  id: string; // 'KIOSK_01' | 'KIOSK_02' | 'KIOSK_03'
  name: string;
  status: RemoteKioskStatus;
  lastUpdated: string;
  activationEvent?: RemoteKioskActivationEvent | null;
}
