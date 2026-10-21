import { db } from './db.js';
import { securityAgent } from './securityAgent.js';
import { memoryService } from './nativeMemoryService.js';
import {
  CCTVVideoEntry,
  CCTVCameraStatus,
  SecurityEvent,
  SecurityEventType
} from '../types/index.js';

/**
 * CCTV SURVEILLANCE DATASET MANIFEST
 * Authoritative mapping of all local CCTV surveillance videos in /public/cctv/
 * 
 * Maps raw physical video/GIF/PNG assets into deterministic security events,
 * temporal observation sequences, camera telemetry, and operational impacts.
 */
export const CCTV_MANIFEST: CCTVVideoEntry[] = [
  // 1. Shoplifting / Jacket & Clothing Concealment
  {
    video_id: 'cctv_001_shoplifting_jacket',
    file_path: '/cctv/CCTV Aisle Shoplifting Sequence.gif',
    file_name: 'CCTV Aisle Shoplifting Sequence.gif',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Aisle 2 (Pantry & Snacks)',
    scenario_type: 'product_concealment',
    scenario_title: 'Product Concealment (Jacket / Clothing)',
    severity: 'HIGH',
    expected_event: 'POSSIBLE_PRODUCT_CONCEALMENT',
    description: 'Customer observed reaching for shelf product and placing it inside jacket/clothing without cart association.',
    email_required: true,
    operational_impact: false,
    confidence: 0.91,
    evidence_frame_url: '/cctv/CCTV Aisle Shoplifting Sequence.gif',
    temporal_timeline: [
      { time: '00:03', timestamp: '11:17:03', stage: 'ENTRY', action: 'Customer enters Aisle 2 in dark jacket with backpack', status: 'OBSERVED' },
      { time: '00:08', timestamp: '11:17:08', stage: 'SHELF_APPROACH', action: 'Approaches snack shelf; scans surrounding aisle', status: 'OBSERVED' },
      { time: '00:14', timestamp: '11:17:14', stage: 'PRODUCT_INTERACTION', action: 'Reaches out, removes item from shelf', status: 'DETECTED' },
      { time: '00:19', timestamp: '11:17:19', stage: 'CONCEALMENT', action: 'Item moved inside jacket; not placed into digital or physical cart', status: 'FLAGGED' },
      { time: '00:24', timestamp: '11:17:24', stage: 'EXIT_MOVEMENT', action: 'Customer turns away from shelf and walks toward exit lane', status: 'ESCALATED' }
    ],
    security_reasoning: 'Observed temporal sequence: Product interaction -> item moved toward inner clothing -> item not visibly placed into shopping cart -> customer moves away from shelf. Consistent with possible product concealment. Manager verification required.',
    recommended_action: 'Discreetly verify customer cart and checkout status at exit turnstile.'
  },

  // 2. Woman Taking Products into Backpack
  {
    video_id: 'cctv_002_backpack_concealment',
    file_path: '/cctv/CCTV Supermarket Aisle Sequence.gif',
    file_name: 'CCTV Supermarket Aisle Sequence.gif',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Aisle 3 (Dry Goods & Snacks)',
    scenario_type: 'woman_backpack_concealment',
    scenario_title: 'Product Concealment (Backpack)',
    severity: 'HIGH',
    expected_event: 'POSSIBLE_PRODUCT_CONCEALMENT',
    description: 'Female customer observed quietly removing multiple products from shelf and placing them into backpack.',
    email_required: true,
    operational_impact: false,
    confidence: 0.89,
    evidence_frame_url: '/cctv/CCTV Supermarket Aisle Sequence.gif',
    temporal_timeline: [
      { time: '00:02', timestamp: '11:27:13', stage: 'PERSON_DETECTED', action: 'Customer detected standing near Aisle 3 shelf', status: 'OBSERVED' },
      { time: '00:06', timestamp: '11:27:17', stage: 'SHELF_INTERACTION', action: 'Inspects multi-pack snack boxes on middle shelf', status: 'OBSERVED' },
      { time: '00:11', timestamp: '11:27:22', stage: 'PRODUCT_REMOVAL', action: 'Removes product package from display shelf', status: 'DETECTED' },
      { time: '00:16', timestamp: '11:27:27', stage: 'BACKPACK_CONCEALMENT', action: 'Unzips backpack and slides product directly inside', status: 'FLAGGED' },
      { time: '00:22', timestamp: '11:27:33', stage: 'DEPARTS_SHELF', action: 'Closes backpack compartment and steps away from aisle', status: 'ESCALATED' }
    ],
    security_reasoning: 'Customer was observed interacting with a product at the shelf and subsequently moving the item toward a personal backpack. The item was no longer visibly associated with the shopping cart. The observed sequence is consistent with possible product concealment. Manager verification required.',
    recommended_action: 'Review evidence frame and verify checkout and cart state before store exit.'
  },

  // 3. Handbag Product Concealment
  {
    video_id: 'cctv_003_handbag_concealment',
    file_path: '/cctv/CCTV Aisle Snapshot with Handbag and Box.png',
    file_name: 'CCTV Aisle Snapshot with Handbag and Box.png',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Aisle 3 (Cereals & Breakfast)',
    scenario_type: 'handbag_concealment',
    scenario_title: 'Handbag Product Concealment',
    severity: 'HIGH',
    expected_event: 'POSSIBLE_PRODUCT_CONCEALMENT',
    description: 'Customer captured placing cereal box directly into open personal shoulder bag.',
    email_required: true,
    operational_impact: false,
    confidence: 0.94,
    evidence_frame_url: '/cctv/CCTV Aisle Snapshot with Handbag and Box.png',
    temporal_timeline: [
      { time: '00:05', timestamp: '12:21:40', stage: 'SHELF_BROWSING', action: 'Customer selects cereal box from top breakfast display', status: 'OBSERVED' },
      { time: '00:09', timestamp: '12:21:44', stage: 'HANDBAG_ALIGNMENT', action: 'Customer opens shoulder handbag with left hand', status: 'DETECTED' },
      { time: '00:12', timestamp: '12:21:46', stage: 'INSERTION', action: 'Item slipped directly into handbag interior compartment', status: 'FLAGGED' },
      { time: '00:15', timestamp: '12:21:50', stage: 'DEPARTURE', action: 'Zips handbag shut and turns toward aisle exit', status: 'ESCALATED' }
    ],
    security_reasoning: 'Customer observed placing packaged breakfast product into personal shoulder handbag rather than cart. Cart not present in camera field. Sequence flagged as possible product concealment.',
    recommended_action: 'Audit checkout register queue for corresponding transaction or offer checkout assistance.'
  },

  // 4. Short Circuit / Electrical Hazard
  {
    video_id: 'cctv_004_electrical_hazard',
    file_path: '/cctv/Supermarket CCTV Electrical Panel Incident.gif',
    file_name: 'Supermarket CCTV Electrical Panel Incident.gif',
    camera_id: 'CAM-01-AISLE-4',
    camera_label: 'CAM-01 Â· Aisle 4 Pillar (Main Electrical Box)',
    scenario_type: 'short_circuit',
    scenario_title: 'Electrical Hazard & Short Circuit',
    severity: 'CRITICAL',
    expected_event: 'ELECTRICAL_HAZARD',
    description: 'Electrical breaker box on pillar sparks with visible flame and smoke near customers in Aisle 4.',
    email_required: true,
    operational_impact: true,
    store_impact: 'Aisle 4 temporarily isolated; redirecting customer indoor routes away from Aisle 4.',
    confidence: 0.98,
    evidence_frame_url: '/cctv/Supermarket CCTV Electrical Panel Incident.gif',
    temporal_timeline: [
      { time: '00:02', timestamp: '16:42:10', stage: 'NORMAL_AISLE', action: 'Normal customer traffic near Aisle 4 breaker box pillar', status: 'NORMAL' },
      { time: '00:07', timestamp: '16:42:15', stage: 'ELECTRICAL_ARC', action: 'Bright spark flash and electrical arcing from breaker panel', status: 'DETECTED' },
      { time: '00:11', timestamp: '16:42:19', stage: 'SMOKE_EMISSION', action: 'Persistent smoke plume and burning odor signature detected', status: 'CRITICAL' },
      { time: '00:16', timestamp: '16:42:24', stage: 'CUSTOMER_EVACUATION', action: 'Shoppers stepping back; safety barrier alert triggered', status: 'ACTION_REQUIRED' }
    ],
    security_reasoning: 'Visual evidence indicates an electrical abnormality with visible sparks, arcing, and smoke near Aisle 4 electrical panel. Immediate safety verification and area isolation required.',
    recommended_action: 'Isolate affected aisle, halt customer traffic, dispatch certified technician, and alert store operations.'
  },

  // 5. Long-Duration Power Outage
  {
    video_id: 'cctv_005_power_outage',
    file_path: '/cctv/Supermarket Blackout_ Lights to Evacuation.gif',
    file_name: 'Supermarket Blackout_ Lights to Evacuation.gif',
    camera_id: 'CAM-FRONT-01',
    camera_label: 'CAM-FRONT-01 Â· Main Floor & Checkout Bays',
    scenario_type: 'power_outage',
    scenario_title: 'Long-Duration Power Outage',
    severity: 'CRITICAL',
    expected_event: 'LONG_DURATION_POWER_OUTAGE',
    description: 'Sudden lighting loss across all supermarket aisles; checkout POS consoles offline; customer evacuation.',
    email_required: true,
    operational_impact: true,
    store_impact: 'Point-of-sale offline; emergency lighting engaged; chillers on auxiliary battery backup.',
    confidence: 0.99,
    evidence_frame_url: '/cctv/Supermarket Blackout_ Lights to Evacuation.gif',
    temporal_timeline: [
      { time: '00:01', timestamp: '19:14:26', stage: 'GRID_ONLINE', action: 'Full supermarket lighting and checkout lanes operational', status: 'NORMAL' },
      { time: '00:04', timestamp: '19:14:29', stage: 'GRID_FAILURE', action: 'Sudden complete loss of overhead luminaire voltage across aisles', status: 'DETECTED' },
      { time: '00:10', timestamp: '19:14:35', stage: 'POS_OFFLINE', action: 'Checkout POS displays dropped offline; auxiliary battery online', status: 'ESCALATED' },
      { time: '00:18', timestamp: '19:14:43', stage: 'LONG_OUTAGE_PERSISTENCE', action: 'Outage persisted past 30s emergency threshold; staff evacuation initiated', status: 'CRITICAL' }
    ],
    security_reasoning: 'Store lighting and checkout systems unavailable across all sectors. Temporal persistence exceeds emergency threshold (30s+). Critical infrastructure disruption.',
    recommended_action: 'Activate emergency backup protocol, safeguard refrigerated dairy/frozen sections, and guide shoppers through illuminated exits.'
  },

  // 6. Aggressive Aisle Confrontation
  {
    video_id: 'cctv_006_aisle_confrontation',
    file_path: '/cctv/CCTV Grocery Aisle Confrontation Sequence.gif',
    file_name: 'CCTV Grocery Aisle Confrontation Sequence.gif',
    camera_id: 'CAM-03-AISLE-3',
    camera_label: 'CAM-03 Â· Aisle 3 (Grocery Central)',
    scenario_type: 'fight_confrontation',
    scenario_title: 'Aggressive Aisle Confrontation',
    severity: 'HIGH',
    expected_event: 'SAFETY_DISTURBANCE',
    description: 'Verbal confrontation and aggressive posturing between customers blocking aisle traffic.',
    email_required: true,
    operational_impact: true,
    store_impact: 'Customer flow in Aisle 3 impeded; floor personnel dispatch recommended.',
    confidence: 0.88,
    evidence_frame_url: '/cctv/CCTV Grocery Aisle Confrontation Sequence.gif',
    temporal_timeline: [
      { time: '00:02', timestamp: '14:28:01', stage: 'TRAFFIC_HALT', action: 'Two shopping carts stop facing each other in central corridor', status: 'OBSERVED' },
      { time: '00:06', timestamp: '14:28:05', stage: 'AGGRESSIVE_POSTURING', action: 'Individuals engage in heated gestures and raised voices', status: 'DETECTED' },
      { time: '00:11', timestamp: '14:28:10', stage: 'CROWD_GATHERING', action: 'Surrounding shoppers pause and step away; potential escalation', status: 'FLAGGED' },
      { time: '00:15', timestamp: '14:28:14', stage: 'SECURITY_ALERT', action: 'Safety disturbance triggered; staff intervention needed', status: 'ESCALATED' }
    ],
    security_reasoning: 'Rapid, aggressive movements and confrontation between multiple customers in Aisle 3. Surrounding foot traffic impeded. Security intervention required to de-escalate.',
    recommended_action: 'Manager/security staff intervention required. Dispatch floor lead to assist.'
  },

  // 7. Checkout Scuffle
  {
    video_id: 'cctv_007_checkout_scuffle',
    file_path: '/cctv/CCTV Supermarket Checkout Scuffle.png',
    file_name: 'CCTV Supermarket Checkout Scuffle.png',
    camera_id: 'CAM-CHECKOUT-CV-01',
    camera_label: 'CAM-CHECKOUT-CV-01 Â· Checkout Counter 3',
    scenario_type: 'fight_checkout',
    scenario_title: 'Physical Scuffle at Checkout',
    severity: 'CRITICAL',
    expected_event: 'AGGRESSIVE_INCIDENT',
    description: 'Physical altercation between shoppers at checkout queue; store security officer intervening.',
    email_required: true,
    operational_impact: true,
    store_impact: 'Checkout lane 3 temporarily suspended; rerouting queue to Counter 4.',
    confidence: 0.95,
    evidence_frame_url: '/cctv/CCTV Supermarket Checkout Scuffle.png',
    temporal_timeline: [
      { time: '00:03', timestamp: '14:28:17', stage: 'QUEUE_DISPUTE', action: 'Dispute over queue priority at Counter 3 register', status: 'OBSERVED' },
      { time: '00:07', timestamp: '14:28:21', stage: 'PHYSICAL_CONTACT', action: 'Physical shoving and grabbing between two shoppers', status: 'DETECTED' },
      { time: '00:10', timestamp: '14:28:24', stage: 'SECURITY_INTERVENTION', action: 'Uniformed security officer steps in to physically separate parties', status: 'CRITICAL' },
      { time: '00:15', timestamp: '14:28:29', stage: 'LANE_CONTAINMENT', action: 'Checkout lane 3 halted; bystanders guided to open registers', status: 'ACTION_REQUIRED' }
    ],
    security_reasoning: 'Active physical altercation at checkout lane requiring physical security intervention. Immediate manager presence requested.',
    recommended_action: 'Security lead on site; manager support required for incident documentation and lane re-opening.'
  },

  // 8. Physical Fight in Grocery Aisle
  {
    video_id: 'cctv_008_supermarket_scuffle',
    file_path: '/cctv/CCTV Supermarket Scuffle.png',
    file_name: 'CCTV Supermarket Scuffle.png',
    camera_id: 'CAM-FRONT-01',
    camera_label: 'CAM-FRONT-01 Â· Dairy Refrigeration Row',
    scenario_type: 'physical_fight',
    scenario_title: 'Physical Fight in Grocery Aisle',
    severity: 'CRITICAL',
    expected_event: 'AGGRESSIVE_INCIDENT',
    description: 'Multiple individuals engaged in physical attack and scuffle in front of dairy chillers.',
    email_required: true,
    operational_impact: true,
    store_impact: 'Dairy section isolated; customer safety perimeter established.',
    confidence: 0.96,
    evidence_frame_url: '/cctv/CCTV Supermarket Scuffle.png',
    temporal_timeline: [
      { time: '00:02', timestamp: '14:37:28', stage: 'PHYSICAL_ATTACK', action: 'Violent physical contact and striking observed in front of dairy chillers', status: 'CRITICAL' },
      { time: '00:06', timestamp: '14:37:32', stage: 'BYSTANDER_RETREAT', action: 'Multiple shoppers retreating with shopping carts', status: 'CRITICAL' },
      { time: '00:11', timestamp: '14:37:37', stage: 'STORE_CODE_RED', action: 'Safety perimeter triggered; security team dispatched', status: 'ACTION_REQUIRED' }
    ],
    security_reasoning: 'Violent physical altercation observed in high-traffic dairy section. High risk to bystander safety. Immediate intervention required.',
    recommended_action: 'Immediate security and management dispatch. Notify local authorities if required.'
  },

  // 9. Crowded Supermarket / High Traffic
  {
    video_id: 'cctv_009_crowded_supermarket',
    file_path: '/cctv/10901926-hd_1920_1080_30fps.mp4',
    file_name: '10901926-hd_1920_1080_30fps.mp4',
    camera_id: 'CAM-FRONT-01',
    camera_label: 'CAM-FRONT-01 Â· Entrance & Fresh Produce',
    scenario_type: 'crowded_aisle',
    scenario_title: 'High Crowd & Aisle Congestion',
    severity: 'LOW',
    expected_event: 'HIGH_AISLE_TRAFFIC',
    description: 'High density of shoppers in fresh produce and main corridor; normal shopping activity with peak foot traffic.',
    email_required: false,
    operational_impact: true,
    store_impact: 'Store Agent notified of surge traffic; recommendation to open secondary checkout lane.',
    confidence: 0.92,
    temporal_timeline: [
      { time: '00:02', timestamp: '18:10:02', stage: 'TRAFFIC_MONITOR', action: 'Produce corridor foot traffic reaches 24 shoppers / min', status: 'OBSERVED' },
      { time: '00:06', timestamp: '18:10:06', stage: 'DENSITY_ELEVATION', action: 'Aisle density index reaches 82% capacity', status: 'DETECTED' },
      { time: '00:10', timestamp: '18:10:10', stage: 'OPERATIONAL_ROUTING', action: 'Store Agent recommends opening Counter 3 to relieve flow', status: 'NORMAL' }
    ],
    security_reasoning: 'Crowd density is elevated above standard baseline. No anomalous security behavior detected. Transmitted to Store Agent for queue and replenishment management.',
    recommended_action: 'Monitor checkout queue wait times; no security intervention required.'
  },

  // 10. Normal Shopping (Cart Aisle Roll)
  {
    video_id: 'cctv_010_normal_cart_walking',
    file_path: '/cctv/12655226_3834_2160_30fps.mp4',
    file_name: '12655226_3834_2160_30fps.mp4',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Aisle 2 (Packaged Foods)',
    scenario_type: 'normal_shopping',
    scenario_title: 'Normal Shopping (Cart Roll)',
    severity: 'LOW',
    expected_event: 'NORMAL_SHOPPING_ACTIVITY',
    description: 'Customer smoothly navigating shopping cart down aisle, browsing packaged goods without anomalies.',
    email_required: false,
    operational_impact: false,
    confidence: 0.97,
    temporal_timeline: [
      { time: '00:02', timestamp: '10:15:02', stage: 'ENTRY', action: 'Customer enters packaged foods corridor with cart', status: 'NORMAL' },
      { time: '00:05', timestamp: '10:15:05', stage: 'SMOOTH_TRANSIT', action: 'Consistent rolling velocity along center floor line', status: 'NORMAL' },
      { time: '00:09', timestamp: '10:15:09', stage: 'BENIGN_BASELINE', action: 'Normal browsing behavior; baseline confirmed', status: 'NORMAL' }
    ],
    security_reasoning: 'Customer actions align with standard shopping velocity and trajectory baselines. No anomalous sequences detected.',
    recommended_action: 'Standard continuous monitoring; no manager action needed.'
  },

  // 11. False-Positive Shelf Browsing
  {
    video_id: 'cctv_011_false_positive_browsing',
    file_path: '/cctv/5104001-uhd_3840_2160_30fps (1).mp4',
    file_name: '5104001-uhd_3840_2160_30fps (1).mp4',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Aisle 1 (Specialty Jars)',
    scenario_type: 'false_positive_repeated_shelf',
    scenario_title: 'Shelf Inspection (False Positive Demo)',
    severity: 'MEDIUM',
    expected_event: 'UNUSUAL_REPEATED_SHELF_ACTIVITY',
    description: 'Customer pauses at top shelf, inspects specialty bottle, re-examines label, and places in cart (verified benign shopping).',
    email_required: false,
    operational_impact: false,
    confidence: 0.84,
    temporal_timeline: [
      { time: '00:03', timestamp: '11:02:03', stage: 'SHELF_PAUSE', action: 'Customer pauses in front of specialty sauce shelf', status: 'OBSERVED' },
      { time: '00:09', timestamp: '11:02:09', stage: 'PRODUCT_EXAM', action: 'Removes top-shelf jar, reads nutritional label closely', status: 'DETECTED' },
      { time: '00:15', timestamp: '11:02:15', stage: 'SECOND_EXAM', action: 'Compares with second jar on adjacent rack', status: 'FLAGGED' },
      { time: '00:20', timestamp: '11:02:20', stage: 'CART_PLACEMENT', action: 'Places chosen jar safely into cart basket; returns second jar', status: 'OBSERVED' }
    ],
    security_reasoning: 'Repeated shelf handling detected. Product was retained in hand for >12s before being placed in shopping cart. Sequence initially flagged for medium review, but aligns with product label comparison.',
    recommended_action: 'Manager review: If product is placed in cart, mark as FALSE POSITIVE to reinforce Hindsight benign baseline.'
  },

  // 12. Checkout Physical-Digital Mismatch
  {
    video_id: 'cctv_012_checkout_mismatch',
    file_path: '/cctv/4249560-uhd_3840_2160_25fps.mp4',
    file_name: '4249560-uhd_3840_2160_25fps.mp4',
    camera_id: 'CAM-CHECKOUT-CV-01',
    camera_label: 'CAM-CHECKOUT-CV-01 Â· Counter Bay 1',
    scenario_type: 'checkout_mismatch',
    scenario_title: 'Checkout Physical-Digital Mismatch',
    severity: 'HIGH',
    expected_event: 'CHECKOUT_QUANTITY_MISMATCH',
    description: 'Computer vision observed 3 physical items in customer cart, but digital transaction order recorded only 2 items.',
    email_required: true,
    operational_impact: false,
    confidence: 0.93,
    temporal_timeline: [
      { time: '00:02', timestamp: '13:45:02', stage: 'CART_AT_REGISTER', action: 'Customer cart arrives at cashier conveyor belt', status: 'OBSERVED' },
      { time: '00:04', timestamp: '13:45:04', stage: 'CV_COUNT', action: 'Camera optical model detects 3 physical items in basket', status: 'DETECTED' },
      { time: '00:07', timestamp: '13:45:07', stage: 'DIGITAL_POLL', action: 'Digital POS register reports 2 items scanned', status: 'FLAGGED' },
      { time: '00:09', timestamp: '13:45:09', stage: 'DISCREPANCY_TRIP', action: 'Physical (+1 unscanned) mismatch triggered deterministically', status: 'ESCALATED' }
    ],
    security_reasoning: 'Deterministic 3-source cross-check identified discrepancy: Physical items observed (3) vs Digital transaction items (2). Delta = +1 physical item. Manager verification required before gate release.',
    recommended_action: 'Assist customer with cart alignment or offer basket adjustment at checkout.'
  },

  // 13. Multiple Products in Cart (Normal)
  {
    video_id: 'cctv_013_multiple_cart_items',
    file_path: '/cctv/4251604-hd_1080_1920_30fps.mp4',
    file_name: '4251604-hd_1080_1920_30fps.mp4',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Frozen Foods Section',
    scenario_type: 'multiple_items_cart',
    scenario_title: 'Multiple Products In Cart (Normal Flow)',
    severity: 'LOW',
    expected_event: 'NORMAL_SHOPPING_ACTIVITY',
    description: 'Customer cart contains multiple bagged vegetables and berries; regular cart shopping sequence.',
    email_required: false,
    operational_impact: false,
    confidence: 0.96,
    temporal_timeline: [
      { time: '00:04', timestamp: '15:20:04', stage: 'FROZEN_ROW', action: 'Cart rolling through frozen vegetable section', status: 'NORMAL' },
      { time: '00:12', timestamp: '15:20:12', stage: 'BASKET_SYNC', action: 'All 4 items in cart matched to customer session RFID', status: 'NORMAL' },
      { time: '00:20', timestamp: '15:20:20', stage: 'BENIGN_STATUS', action: 'Inventory ledger and digital cart aligned', status: 'NORMAL' }
    ],
    security_reasoning: 'Items in cart correspond to active customer shopping session. No discrepancies observed.',
    recommended_action: 'Standard passive tracking.'
  },

  // 14. Normal Checkout Queue
  {
    video_id: 'cctv_014_checkout_queue',
    file_path: '/cctv/15717536_2160_3840_60fps.mp4',
    file_name: '15717536_2160_3840_60fps.mp4',
    camera_id: 'CAM-CHECKOUT-CV-01',
    camera_label: 'CAM-CHECKOUT-CV-01 Â· Main Queue Lane',
    scenario_type: 'normal_checkout_queue',
    scenario_title: 'Normal Checkout Queue',
    severity: 'LOW',
    expected_event: 'NORMAL_SHOPPING_ACTIVITY',
    description: 'Shoppers in orderly queue with baskets and carts at checkout; regular transit speed.',
    email_required: false,
    operational_impact: false,
    confidence: 0.95,
    temporal_timeline: [
      { time: '00:03', timestamp: '16:05:03', stage: 'QUEUE_ENTRY', action: 'Shoppers joining Counter 2 checkout lane', status: 'NORMAL' },
      { time: '00:07', timestamp: '16:05:07', stage: 'PACE_CHECK', action: 'Average service time: 45 seconds / customer', status: 'NORMAL' },
      { time: '00:10', timestamp: '16:10:10', stage: 'FLOW_CONFIRMED', action: 'Regular checkout throughput confirmed', status: 'NORMAL' }
    ],
    security_reasoning: 'Checkout queue progressing smoothly within expected service time windows. Zero anomalous activity.',
    recommended_action: 'None.'
  },

  // 15. Contactless POS Payment Verification
  {
    video_id: 'cctv_015_contactless_checkout',
    file_path: '/cctv/4121750-uhd_3840_2160_25fps.mp4',
    file_name: '4121750-uhd_3840_2160_25fps.mp4',
    camera_id: 'CAM-CHECKOUT-CV-01',
    camera_label: 'CAM-CHECKOUT-CV-01 Â· POS Payment Terminal',
    scenario_type: 'pos_payment',
    scenario_title: 'Checkout POS Payment Verification',
    severity: 'LOW',
    expected_event: 'NORMAL_SHOPPING_ACTIVITY',
    description: 'Customer completing contactless mobile wallet payment at checkout terminal.',
    email_required: false,
    operational_impact: false,
    confidence: 0.98,
    temporal_timeline: [
      { time: '00:02', timestamp: '17:30:02', stage: 'NFC_TAP', action: 'Customer holds mobile smartphone over POS terminal', status: 'NORMAL' },
      { time: '00:05', timestamp: '17:30:05', stage: 'GATEWAY_HANDSHAKE', action: 'Authoritative transaction approval received', status: 'NORMAL' },
      { time: '00:09', timestamp: '17:30:09', stage: 'RECEIPT_DISPATCH', action: 'Digital receipt generated and sent to customer account', status: 'NORMAL' }
    ],
    security_reasoning: 'Payment completed successfully through authorized gateway. Turnstile unlock authorized.',
    recommended_action: 'None.'
  },

  // 16. Warehouse Inventory Racks
  {
    video_id: 'cctv_016_warehouse_pallets',
    file_path: '/cctv/9010438-uhd_3840_2160_30fps.mp4',
    file_name: '9010438-uhd_3840_2160_30fps.mp4',
    camera_id: 'CAM-04B',
    camera_label: 'CAM-04B Â· Bulk Storage Pallet Racks',
    scenario_type: 'pallet_storage',
    scenario_title: 'Warehouse Inventory Racks',
    severity: 'LOW',
    expected_event: 'NORMAL_SHOPPING_ACTIVITY',
    description: 'Overhead view of wholesale bulk pallet racks; all items stationary and undisturbed.',
    email_required: false,
    operational_impact: false,
    confidence: 0.99,
    temporal_timeline: [
      { time: '00:03', timestamp: '08:00:03', stage: 'STATIC_AUDIT', action: 'Overhead optical scan of bulk pallet levels 1-3', status: 'NORMAL' },
      { time: '00:08', timestamp: '08:00:08', stage: 'WRAP_INTEGRITY', action: 'Protective shrink-wrap verified intact across all pallets', status: 'NORMAL' },
      { time: '00:13', timestamp: '08:00:13', stage: 'ZERO_DISPLACEMENT', action: 'No unauthorized access or movement detected', status: 'NORMAL' }
    ],
    security_reasoning: 'Storage area stable; inventory physical state matches warehouse database records.',
    recommended_action: 'None.'
  },

  // 17. Self-Checkout Scanning Verification
  {
    video_id: 'cctv_017_self_checkout_scan',
    file_path: '/cctv/7457422-hd_1920_1080_30fps.mp4',
    file_name: '7457422-hd_1920_1080_30fps.mp4',
    camera_id: 'CAM-CHECKOUT-CV-01',
    camera_label: 'CAM-CHECKOUT-CV-01 Â· Self-Checkout Kiosk 2',
    scenario_type: 'self_checkout_scan',
    scenario_title: 'Self-Checkout Scanning Verification',
    severity: 'LOW',
    expected_event: 'NORMAL_SHOPPING_ACTIVITY',
    description: 'Customer scanning item barcodes across terminal scanner; verified digital sync.',
    email_required: false,
    operational_impact: false,
    confidence: 0.96,
    temporal_timeline: [
      { time: '00:05', timestamp: '12:40:05', stage: 'BARCODE_SWIPE', action: 'Customer passes bag of produce across scanner glass', status: 'NORMAL' },
      { time: '00:12', timestamp: '12:40:12', stage: 'SCALE_SETTLING', action: 'Scale weight delta matches product catalog specifications', status: 'NORMAL' },
      { time: '00:25', timestamp: '12:40:25', stage: 'BAGGING_VERIFIED', action: 'Item moved directly to bagging area without discrepancy', status: 'NORMAL' }
    ],
    security_reasoning: 'Item scan, weight scale reading, and bagging area sensors successfully matched in real time.',
    recommended_action: 'None.'
  }
];

export class CCTVManifestService {
  private activeSimulations = new Map<string, SecurityEvent>();

  public getManifest(): CCTVVideoEntry[] {
    return CCTV_MANIFEST;
  }

  public getVideoById(id: string): CCTVVideoEntry | undefined {
    return CCTV_MANIFEST.find(v => v.video_id === id);
  }

  public getVideosByScenario(scenarioType: string): CCTVVideoEntry[] {
    return CCTV_MANIFEST.filter(v => v.scenario_type.includes(scenarioType));
  }

  public getCameras(): CCTVCameraStatus[] {
    const events = db.getSecurityEvents();
    
    // Core camera stations
    const stations: { id: string; name: string; location: string }[] = [
      { id: 'CAM-FRONT-01', name: 'Front Entrance & Main Hall', location: 'Store Entrance' },
      { id: 'CAM-04B', name: 'Aisle 2 & 3 Smart Overhead', location: 'Packaged & Dry Goods' },
      { id: 'CAM-CHECKOUT-CV-01', name: 'Checkout Optical Gate 01', location: 'Checkout Counter Bays' },
      { id: 'CAM-01-AISLE-4', name: 'Aisle 4 Power & Infrastructure', location: 'Aisle 4 Electrical Pillar' },
      { id: 'CAM-03-AISLE-3', name: 'Aisle 3 Central Telemetry', location: 'Aisle 3 Central Corridor' }
    ];

    return stations.map(station => {
      const relatedEvents = events.filter(e => (e.metadata as any)?.camera_id === station.id || (e.metadata as any)?.camera === station.id);
      const latest = relatedEvents[0];
      
      let status: CCTVCameraStatus['status'] = 'NORMAL';
      let sev: CCTVCameraStatus['severity'] = 'LOW';

      if (latest && latest.status !== 'RESOLVED') {
        if (latest.severity === 'critical') {
          status = 'CRITICAL';
          sev = 'CRITICAL';
        } else if (latest.severity === 'high') {
          status = 'HIGH_ALERT';
          sev = 'HIGH';
        } else if (latest.severity === 'medium') {
          status = 'WARNING';
          sev = 'MEDIUM';
        } else {
          status = 'MONITORING';
          sev = 'LOW';
        }
      }

      return {
        camera_id: station.id,
        name: station.name,
        location: station.location,
        status,
        last_event: latest?.details,
        severity: sev
      };
    });
  }

  /**
   * Deterministic Video Analysis & Security Event Pipeline
   * 
   * Flow:
   * VIDEO -> OBSERVATION -> EVENT DETECTION -> DETERMINISTIC RULES -> 
   * SECURITY AGENT REASONING -> SECURITY EVENT -> ALERT -> SECURITY HINDSIGHT
   */
  public async processCCTVVideo(videoEntry: CCTVVideoEntry): Promise<{
    securityEvent: SecurityEvent;
    emailAlertEventGenerated: boolean;
    storeOperationalDispatched: boolean;
  }> {
    const eventId = `SEC-CCTV-${videoEntry.video_id.substring(0, 8)}-${Date.now().toString().slice(-4)}`;

    // 1. Create or retrieve existing security event
    const newEvent: SecurityEvent = {
      id: eventId,
      event_type: videoEntry.expected_event,
      severity: videoEntry.severity.toLowerCase() as any,
      status: 'OPEN',
      details: videoEntry.description,
      timestamp: new Date().toISOString(),
      metadata: {
        camera_id: videoEntry.camera_id,
        camera_label: videoEntry.camera_label,
        video_id: videoEntry.video_id,
        file_name: videoEntry.file_name,
        file_path: videoEntry.file_path,
        scenario_type: videoEntry.scenario_type,
        scenario_title: videoEntry.scenario_title,
        confidence: videoEntry.confidence || 0.9,
        timeline: videoEntry.temporal_timeline,
        security_reasoning: videoEntry.security_reasoning,
        operational_impact: videoEntry.operational_impact,
        store_impact: videoEntry.store_impact,
        evidence_frame_url: videoEntry.evidence_frame_url || videoEntry.file_path,
        is_demo_cctv: true
      },
      triggering_rule: videoEntry.expected_event === 'POSSIBLE_PRODUCT_CONCEALMENT'
        ? 'TEMPORAL_CONCEALMENT_SEQUENCE_DETECTOR'
        : videoEntry.expected_event === 'ELECTRICAL_HAZARD'
        ? 'ELECTRICAL_ARC_THERMAL_DETECTION_RULE'
        : videoEntry.expected_event === 'LONG_DURATION_POWER_OUTAGE' || videoEntry.expected_event === 'POWER_OUTAGE'
        ? 'CRITICAL_INFRASTRUCTURE_FAILURE_THRESHOLD'
        : videoEntry.expected_event === 'SAFETY_DISTURBANCE' || videoEntry.expected_event === 'AGGRESSIVE_INCIDENT'
        ? 'PROXIMITY_ALTERCATION_KINEMATICS_RULE'
        : videoEntry.expected_event === 'CHECKOUT_QUANTITY_MISMATCH'
        ? 'DETERMINISTIC_3_SOURCE_COMPARISON'
        : 'BENIGN_BEHAVIORAL_BASELINE_VERIFIER',
      recommendedAction: videoEntry.recommended_action
    };

    // 2. Alert policy gate: Only HIGH and CRITICAL generate Email Alert Events
    let emailAlertEventGenerated = false;
    if (videoEntry.email_required && (videoEntry.severity === 'HIGH' || videoEntry.severity === 'CRITICAL')) {
      newEvent.emailDispatched = true;
      emailAlertEventGenerated = true;

      // Persist the email-ready alert in the system notification ledger
      db.addNotification({
        customer_id: 'manager',
        type: 'security_alert',
        title: `Security Alert: ${videoEntry.scenario_title}`,
        message: `${videoEntry.description} (Camera: ${videoEntry.camera_id}) - Email alert queued for manager dispatch.`,
        read: false,
        created_at: new Date().toISOString(),
        actions: [{ type: 'view_deal', label: 'View Security Hub', route: '/store/dashboard' }]
      });
    }

    // 3. Log event into authoritative DB state
    const savedEvent = db.logSecurityEvent(newEvent);
    this.activeSimulations.set(videoEntry.video_id, savedEvent);

    // 4. Operational bridge: Connect to existing Store Agent and Store Hindsight if operational_impact is true
    let storeOperationalDispatched = false;
    if (videoEntry.operational_impact) {
      storeOperationalDispatched = true;

      // Add operational recommendation to Store Agent
      db.addAIRecommendation({
        id: `REC-OPERATIONAL-${Date.now()}`,
        type: 'operational',
        title: `Operations Alert: ${videoEntry.scenario_title}`,
        description: videoEntry.store_impact || videoEntry.description,
        suggested_action: videoEntry.recommended_action,
        confidence: videoEntry.confidence || 0.95,
        priority: videoEntry.severity === 'CRITICAL' ? 'urgent' : 'high',
        expected_impact: 'Immediate customer safety & operational continuity',
        historical_evidence: `CCTV Camera ${videoEntry.camera_id} detected ${videoEntry.expected_event}`,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Retain operational memory in Store Hindsight
      await memoryService.retainStoreExperience({
        situation: `${videoEntry.scenario_title} observed on ${videoEntry.camera_id}`,
        actionTaken: videoEntry.recommended_action,
        measuredOutcome: videoEntry.store_impact || 'Operational safety protocol engaged',
        tags: ['surveillance', 'operational_safety', videoEntry.scenario_type]
      });
    }

    return {
      securityEvent: savedEvent,
      emailAlertEventGenerated,
      storeOperationalDispatched
    };
  }

  /**
   * Records Manager review action (Confirm, False Positive, Dismiss, Resolved)
   * Feeds the result into Security Hindsight for future experiential adaptation.
   */
  public async handleManagerAction(
    eventId: string,
    action: 'CONFIRM_INCIDENT' | 'FALSE_POSITIVE' | 'DISMISS' | 'RESOLVED',
    notes?: string
  ): Promise<{ success: boolean; memoryRetained: boolean }> {
    const isFalsePositive = action === 'FALSE_POSITIVE';
    const resolutionNote = notes || (
      isFalsePositive
        ? 'Reviewed footage: Customer temporarily inspected product before returning or purchasing; determined to be benign.'
        : 'Reviewed footage: Physical-digital evidence confirmed by manager review.'
    );

    // Resolve incident via authoritative SecurityAgent
    const resolution = await securityAgent.resolveIncident(eventId, isFalsePositive, resolutionNote);

    // Update event in DB
    db.updateSecurityEvent(eventId, {
      status: 'RESOLVED',
      isFalsePositive,
      resolution: resolutionNote,
      resolved_at: new Date().toISOString()
    });

    return {
      success: true,
      memoryRetained: resolution.memoryRetained
    };
  }
}

export const cctvManifestService = new CCTVManifestService();


