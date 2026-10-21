export type LearningAgent = 'CUSTOMER' | 'STORE' | 'SECURITY';

export interface NativeMemoryLearningScenario {
  id: string;
  agent: LearningAgent;
  title: string;
  description: string;
  scope: string;
  context: string;
  observedEvent: string;
  actionTaken: string;
  actualOutcome: string;
  futureSituation: string;
  recallQuery: string;
  baselineRecommendation: string;
  decisionContext: string;
  authorizationNote: string;
}

export const NATIVE_MEMORY_LEARNING_SCENARIOS: NativeMemoryLearningScenario[] = [
  {
    id: 'C1', agent: 'CUSTOMER', title: 'Personalized shopping preferences',
    description: 'Remember an explicitly preferred bread brand and a rejected brand for this customer only.',
    scope: 'Synthetic demo customer LAB-C1', context: 'A demo customer chose their usual breakfast bread.',
    observedEvent: 'Customer preferred North Mill whole wheat bread and explicitly rejected Daily White bread.',
    actionTaken: 'Recommended the requested preferred brand when available; no cart change was made.',
    actualOutcome: 'Demo customer confirmed the preference and rejected the alternative.',
    futureSituation: 'The same demo customer asks for their usual breakfast items in a later visit.',
    recallQuery: 'LAB-C1 usual breakfast bread preference rejected brand',
    baselineRecommendation: 'Ask which bread brand the customer prefers.',
    decisionContext: 'Use only explicit preference evidence and current catalog availability. Do not recommend the rejected brand while this preference remains relevant.',
    authorizationNote: 'Recommendation only; customer must confirm any cart addition.'
  },
  {
    id: 'C2', agent: 'CUSTOMER', title: 'Budget-aware basket planning',
    description: 'Remember an explicit basket budget and accepted trade-offs without storing temporary cart contents.',
    scope: 'Synthetic demo customer LAB-C2', context: 'A demo customer planned a grocery basket with a stated â‚¹300 ceiling.',
    observedEvent: 'Customer removed the premium snack after the proposed basket exceeded â‚¹300 and chose a lower-priced alternative.',
    actionTaken: 'Recalculated the basket using the catalog price values available in the demonstration.',
    actualOutcome: 'The demo basket was brought under the stated â‚¹300 budget after the customer accepted the trade-off.',
    futureSituation: 'The same demo customer requests another basket under â‚¹300.',
    recallQuery: 'LAB-C2 basket under 300 budget accepted trade off',
    baselineRecommendation: 'Build a new basket from the current request and ask about budget.',
    decisionContext: 'Treat the previous ceiling and accepted trade-off as customer-provided history. Use current authoritative prices for any total; memory contains no current price authority.',
    authorizationNote: 'Do not add or purchase items without customer confirmation.'
  },
  {
    id: 'C3', agent: 'CUSTOMER', title: 'Intelligent substitutions',
    description: 'Recall a substitute accepted for one unavailable product and another the customer rejected.',
    scope: 'Synthetic demo customer LAB-C3', context: 'A demo customer requested an unavailable cereal and considered two alternatives.',
    observedEvent: 'Customer accepted Grain House rolled oats and rejected SweetStart granola as a substitute for the unavailable cereal.',
    actionTaken: "Presented both alternatives and waited for the customer's choice.",
    actualOutcome: 'Customer selected Grain House rolled oats; the rejected granola was not added.',
    futureSituation: 'The same original product is unavailable during a later visit.',
    recallQuery: 'LAB-C3 accepted rejected substitute unavailable cereal oats granola',
    baselineRecommendation: 'Offer suitable in-stock substitutes and ask the customer to choose.',
    decisionContext: 'Prefer the previously accepted substitute only if it remains suitable and in stock. Preserve the recorded rejection and ask before changing the cart.',
    authorizationNote: 'No automatic substitution or cart modification.'
  },
  {
    id: 'C4', agent: 'CUSTOMER', title: 'Product location assistance',
    description: 'Recall a prior successful location lookup while checking current catalog data first.',
    scope: 'Synthetic demo customer LAB-C4', context: 'A demo customer found a product using the store map and live catalog.',
    observedEvent: 'Demo product Green Valley chickpeas was found in Aisle 3, Shelf B according to the catalog at that time.',
    actionTaken: 'Provided directions from current store-map data.',
    actualOutcome: 'Customer confirmed finding the item at the displayed location.',
    futureSituation: 'The same demo customer asks where Green Valley chickpeas are now.',
    recallQuery: 'LAB-C4 Green Valley chickpeas found aisle location',
    baselineRecommendation: 'Look up the current product location in the catalog.',
    decisionContext: 'Current catalog and store-map location are authoritative. Treat the recalled location as historical context and disclose any mismatch.',
    authorizationNote: 'Navigation guidance only.'
  },
  {
    id: 'C5', agent: 'CUSTOMER', title: 'Repeat-purchase assistance',
    description: 'Use repeated purchases across sessions to suggest a shortlist, not restore an old cart.',
    scope: 'Synthetic demo customer LAB-C5', context: 'Two completed synthetic demo purchases in separate session records contained oats and tomatoes.',
    observedEvent: 'The demo customer purchased rolled oats and tomatoes in two separate completed demo sessions.',
    actionTaken: 'Recorded completed purchase pattern after each demo session.',
    actualOutcome: 'The same two products appeared across both demo purchase records.',
    futureSituation: 'The demo customer asks for their regular shopping list.',
    recallQuery: 'LAB-C5 recurring purchases regular list oats tomatoes separate sessions',
    baselineRecommendation: 'Ask the customer to provide the list for this visit.',
    decisionContext: 'Suggest recurring products only when retrieved evidence supports a pattern. Check current availability and price; do not infer quantities.',
    authorizationNote: 'Shortlist only; no automatic cart restoration or purchase.'
  },
  {
    id: 'C6', agent: 'CUSTOMER', title: 'Learning from customer corrections',
    description: 'Retain a one-time correction with context so it is not generalized beyond the request.',
    scope: 'Synthetic demo customer LAB-C6', context: 'A demo customer corrected an unsuitable product suggestion for a pasta recipe.',
    observedEvent: 'Customer said the suggested sweetened sauce did not suit this recipe and chose a plain tomato sauce instead.',
    actionTaken: 'Accepted the correction and presented the selected plain sauce.',
    actualOutcome: 'Customer confirmed the plain sauce for this recipe only.',
    futureSituation: 'The same demo customer asks for sauce for a similar pasta recipe.',
    recallQuery: 'LAB-C6 correction sweetened sauce unsuitable recipe plain tomato sauce',
    baselineRecommendation: 'Recommend sauce by recipe and ask about preferences.',
    decisionContext: 'Apply the correction only to a similar recipe context. Do not turn this single correction into a universal dislike.',
    authorizationNote: 'Recommendation only; customer chooses.'
  },
  {
    id: 'C7', agent: 'CUSTOMER', title: 'Cross-session continuity',
    description: 'Recall customer-scoped preferences after identity QR sign-in without restoring cart state.',
    scope: 'Synthetic demo customer LAB-C7', context: 'Demo customer established a dairy-free preference and ended a prior session.',
    observedEvent: 'Customer stated a dairy-free preference during a completed demo visit; the temporary cart was not retained as a preference.',
    actionTaken: "Stored the explicit preference in the customer's isolated memory scope.",
    actualOutcome: 'A later demo session began with a fresh empty cart.',
    futureSituation: 'The same synthetic customer returns through identity QR and asks for a breakfast suggestion.',
    recallQuery: 'LAB-C7 dairy-free preference breakfast returning customer fresh session',
    baselineRecommendation: 'Ask about dietary requirements at the start of a new visit.',
    decisionContext: "Use this customer's own recalled preference. Never restore session or cart state from memory.",
    authorizationNote: 'Personalized suggestion only; no cart change.'
  },
  {
    id: 'S1', agent: 'STORE', title: 'Repeated stockout learning',
    description: 'Recall repeated time-window stockouts while grounding any recommendation in current inventory and demand.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'Two synthetic Sunday evening stockout records were observed for demo product Oat Milk.',
    observedEvent: 'Oat Milk stocked out during two Sunday evening windows; demo event records include observed requests and replenishment quantities.',
    actionTaken: 'A manager-approved replenishment was recorded in the demo event.',
    actualOutcome: 'The second demo window still recorded unmet requests; values are synthetic scenario input.',
    futureSituation: 'A comparable Sunday demand window approaches.',
    recallQuery: 'S1 Oat Milk repeated Sunday evening stockout replenishment unmet demand',
    baselineRecommendation: 'Calculate replenishment from current stock, recent confirmed sales, and current unmet demand.',
    decisionContext: 'Use recalled stockout history as context only. Recalculate from live inventory and demand before proposing quantity.',
    authorizationNote: 'Recommendation only; manager approval is required before inventory changes.'
  },
  {
    id: 'S2', agent: 'STORE', title: 'Kiosk congestion management',
    description: 'Recall a manager-approved kiosk opening and its measured synthetic queue result.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'Demo Kiosk 2 reached a recorded queue threshold.',
    observedEvent: 'Kiosk 2 queue wait reached 8 minutes in the synthetic scenario.',
    actionTaken: 'Manager approved opening Kiosk 3 for queue relief.',
    actualOutcome: 'The synthetic follow-up record showed a 3 minute wait after activation.',
    futureSituation: 'A new queue forms at Kiosk 2.',
    recallQuery: 'S2 Kiosk 2 congestion Kiosk 3 activation queue wait measured result',
    baselineRecommendation: 'Inspect current kiosk status and queue duration before opening another kiosk.',
    decisionContext: 'Compare current queue measurements with recalled outcome and current available kiosk capacity.',
    authorizationNote: 'Do not activate a kiosk; manager authorization and existing kiosk service are required.'
  },
  {
    id: 'S3', agent: 'STORE', title: 'Expiry and wastage reduction',
    description: 'Use a synthetic over-order and wastage record to inform policy-approved stock rotation review.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'A demo batch approached expiry after a synthetic over-order.',
    observedEvent: 'The synthetic batch had excess units and low sell-through before its recorded expiry date.',
    actionTaken: 'The manager reviewed stock rotation and a markdown request under store policy.',
    actualOutcome: 'The demo outcome records reduced waste; this does not represent a live inventory action.',
    futureSituation: 'A comparable batch approaches expiry.',
    recallQuery: 'S3 expiry batch over-order sell-through wastage stock rotation markdown review',
    baselineRecommendation: 'Review current batch age, stock, and sales velocity.',
    decisionContext: 'Use current lot and sales data first. Recall can support a stock rotation or markdown review under policy.',
    authorizationNote: 'No price, inventory, or stock rotation change without authorized approval.'
  },
  {
    id: 'S4', agent: 'STORE', title: 'Supplier reliability',
    description: 'Retain verified delivery evidence while avoiding conclusions from one incident.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'A synthetic purchase order delivery was checked against its confirmed quantity and time.',
    observedEvent: 'Demo Supplier A delivered 16 of 20 confirmed units and arrived one day after the recorded delivery window.',
    actionTaken: 'Receiving staff recorded the count and delivery time against the demo order.',
    actualOutcome: 'One late and short delivery was verified in this synthetic record.',
    futureSituation: 'The store plans another order with this supplier.',
    recallQuery: 'S4 Supplier A late delivery short quantity confirmed order evidence',
    baselineRecommendation: 'Plan from the current order and supplier-confirmed delivery date.',
    decisionContext: 'Treat one event as a single verified observation, not conclusive reliability evidence. Review repeated records and current commitments.',
    authorizationNote: 'Supplier selection and purchase-order changes require manager approval.'
  },
  {
    id: 'S5', agent: 'STORE', title: 'Inventory discrepancy learning',
    description: 'Recall a verified recount while preserving current inventory as authoritative.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'A synthetic system count was compared with a physical recount.',
    observedEvent: 'System count was 20 units; physical count and independent recount both found 16 units.',
    actionTaken: 'An authorized employee recorded the recount and investigation evidence.',
    actualOutcome: 'The synthetic discrepancy was confirmed at 4 units.',
    futureSituation: 'A comparable count discrepancy is reported.',
    recallQuery: 'S5 system 20 physical recount 16 inventory discrepancy verified correction',
    baselineRecommendation: 'Check the current system count and request a recount.',
    decisionContext: 'Memory supports an audit/recount workflow only. Do not overwrite current stock from historical facts.',
    authorizationNote: 'Inventory correction requires authorized verification.'
  },
  {
    id: 'S6', agent: 'STORE', title: 'Peak-hour staffing',
    description: 'Recall an approved staffing adjustment and measured synthetic queue outcome.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'Queue measurements in the synthetic record showed a recurring peak window.',
    observedEvent: 'Demo checkout wait increased between 18:00 and 19:00 while two counters were staffed.',
    actionTaken: 'A manager approved a one-hour associate coverage adjustment for the demo scenario.',
    actualOutcome: 'The synthetic queue record showed a shorter wait during the adjusted period.',
    futureSituation: 'A similar peak window is approaching with current staffing and queue data available.',
    recallQuery: 'S6 peak hour staffing checkout queue duration approved coverage adjustment measured',
    baselineRecommendation: 'Review current workload and staffing coverage for the upcoming period.',
    decisionContext: 'Use the recalled observation with current workload, availability, and policy. Historical outcome alone does not justify scheduling.',
    authorizationNote: 'Never change an employee schedule without manager authorization.'
  },
  {
    id: 'S7', agent: 'STORE', title: 'Learning from failed operational actions',
    description: 'Retain a failed action and recommend reviewing alternatives rather than repeating it blindly.',
    scope: 'Synthetic demo store DEMO-STORE', context: 'A synthetic restock did not resolve repeated stockouts for demo product Lentils.',
    observedEvent: 'A 10 unit replenishment was followed by another stockout during the same synthetic demand period.',
    actionTaken: 'A manager-approved demo replenishment was recorded.',
    actualOutcome: 'The recorded synthetic outcome was continued unmet demand.',
    futureSituation: 'Comparable demand returns while the current stock and demand measurements are visible.',
    recallQuery: 'S7 failed 10 unit replenishment repeated stockout unmet demand alternative policy',
    baselineRecommendation: 'Recalculate replenishment using current inventory and demand.',
    decisionContext: 'Treat the failed action as evidence to review, not as a direct quantity rule. Use current facts and approved store policy.',
    authorizationNote: 'No inventory change without manager approval.'
  },
  {
    id: 'SEC1', agent: 'SECURITY', title: 'False-positive barcode alerts',
    description: 'Recall an authorized damaged-barcode resolution without assuming future alerts are benign.',
    scope: 'Synthetic demo security incident SEC-LAB-1', context: 'A synthetic damaged barcode generated an item-read alert.',
    observedEvent: 'Barcode read failed twice; authorized employee inspection confirmed a damaged label and matched the product to the catalog.',
    actionTaken: 'Employee rescanned the item and recorded the verified catalog match.',
    actualOutcome: 'The synthetic alert was resolved as a scanning issue after independent verification.',
    futureSituation: 'A similar barcode-read failure occurs.',
    recallQuery: 'SEC1 damaged barcode false positive employee verified catalog rescan resolution',
    baselineRecommendation: 'Pause the scan and independently verify the item and catalog record.',
    decisionContext: 'Recall the prior recovery procedure, then verify current barcode, item, and catalog data independently.',
    authorizationNote: 'Do not dismiss the alert or bypass product verification.'
  },
  {
    id: 'SEC2', agent: 'SECURITY', title: 'Product SKU mismatch',
    description: 'Recall a verified SKU mismatch resolution while checking the current cart and scan independently.',
    scope: 'Synthetic demo security incident SEC-LAB-2', context: 'A synthetic scan returned a different SKU than the cart expectation.',
    observedEvent: 'Expected demo SKU SKU-204; observed demo SKU SKU-240.',
    actionTaken: 'Authorized employee rescanned the barcode and compared item packaging with the catalog.',
    actualOutcome: 'The synthetic mismatch was resolved as a wrong product selection after verification.',
    futureSituation: 'Another expected-versus-observed SKU mismatch occurs.',
    recallQuery: 'SEC2 expected observed SKU mismatch employee rescan catalog verification',
    baselineRecommendation: 'Keep the mismatch unresolved and verify the scanned product.',
    decisionContext: 'Use historical resolution only as a checklist. Check the current expected SKU, scanned SKU, package, and cart.',
    authorizationNote: 'Never bypass the SKU or checkout verification gate.'
  },
  {
    id: 'SEC3', agent: 'SECURITY', title: 'Quantity discrepancy',
    description: 'Recall a prior scan-count reconciliation while keeping checkout blocked until current counts match.',
    scope: 'Synthetic demo security incident SEC-LAB-3', context: 'A synthetic checkout compared digital cart quantity with physical scan count.',
    observedEvent: 'Digital cart contained two demo units; one physical unit had been scanned.',
    actionTaken: 'Customer was asked to scan the missing unit or request authorized employee verification.',
    actualOutcome: 'The synthetic case closed only after counts were reconciled.',
    futureSituation: 'A similar cart-versus-scan quantity discrepancy occurs.',
    recallQuery: 'SEC3 digital cart two physical one quantity discrepancy reconciliation checkout',
    baselineRecommendation: 'Request the missing scan or an authorized reconciliation.',
    decisionContext: 'Historical evidence can guide neutral wording; it cannot clear the current transaction.',
    authorizationNote: 'Keep checkout blocked until current quantities reconcile.'
  },
  {
    id: 'SEC4', agent: 'SECURITY', title: 'Learning from employee resolutions',
    description: 'Recall evidence from an authorized resolution but assess each new transaction independently.',
    scope: 'Synthetic demo security incident SEC-LAB-4', context: 'An authorized employee investigated a synthetic scan alert.',
    observedEvent: 'Employee matched the scanned item, receipt, and catalog record before resolving the demo alert.',
    actionTaken: 'Employee documented the evidence and the authorized resolution.',
    actualOutcome: 'The synthetic case was resolved after the evidence matched.',
    futureSituation: 'A similar alert appears on a later synthetic transaction.',
    recallQuery: 'SEC4 authorized employee evidence-based alert resolution scan receipt catalog',
    baselineRecommendation: 'Investigate the current alert and collect the relevant evidence.',
    decisionContext: 'A prior employee decision is precedent only. Verify the present item, receipt, scan, and transaction independently.',
    authorizationNote: 'Do not automatically dismiss an alert based on historical resolution.'
  },
  {
    id: 'SEC5', agent: 'SECURITY', title: 'Repeated weight discrepancies',
    description: 'Recall a verified scale/product-selection cause and recheck current measurements.',
    scope: 'Synthetic demo security incident SEC-LAB-5', context: 'A synthetic produce weight differed from the expected range.',
    observedEvent: 'Authorized review found that the demo item was placed under the wrong produce selection on the scale.',
    actionTaken: 'Employee checked the scale zero, product selection, and measured weight before correcting the selection.',
    actualOutcome: 'The corrected selection produced a matching synthetic weight record.',
    futureSituation: 'Another produce weight discrepancy is detected.',
    recallQuery: 'SEC5 produce weight discrepancy scale zero wrong product selection verified cause',
    baselineRecommendation: 'Check the scale, item selection, and current measured weight.',
    decisionContext: 'Recall the previous troubleshooting order, then use only current scale evidence and authorized correction.',
    authorizationNote: 'Do not alter the weight record without authorized verification.'
  },
  {
    id: 'SEC6', agent: 'SECURITY', title: 'Checkout workflow recovery',
    description: 'Recall a supported recovery after scanner/network failure without bypassing checkout controls.',
    scope: 'Synthetic demo security incident SEC-LAB-6', context: 'A synthetic scanner/network interruption paused checkout.',
    observedEvent: 'A network timeout interrupted a demo item scan before the item was confirmed.',
    actionTaken: 'Employee used the supported retry, then manual verification when the second retry timed out.',
    actualOutcome: 'Checkout resumed only after the item and cart were verified through the approved process.',
    futureSituation: 'A similar scanner or network interruption occurs.',
    recallQuery: 'SEC6 checkout scanner network timeout retry manual verification recovery',
    baselineRecommendation: 'Pause checkout and follow the documented recovery process.',
    decisionContext: 'Use the recalled retry sequence only if currently supported; preserve all present checkout checks.',
    authorizationNote: 'Never bypass item, payment, or checkout verification.'
  },
  {
    id: 'SEC7', agent: 'SECURITY', title: 'Contextual incident triage',
    description: 'Recall authorized investigation steps while avoiding conclusions about a person from history.',
    scope: 'Synthetic demo security incident SEC-LAB-7', context: 'An authorized investigation reviewed synthetic transaction and camera evidence.',
    observedEvent: 'A demo alert was reviewed against the transaction timeline and authorized camera observation.',
    actionTaken: 'Employee documented evidence and resolved the incident through the authorized workflow.',
    actualOutcome: "The synthetic incident was resolved without making a claim about an individual's intent.",
    futureSituation: 'A similar alert requires contextual triage.',
    recallQuery: 'SEC7 contextual triage authorized transaction CCTV evidence resolution',
    baselineRecommendation: 'Review current authorized evidence and route the case under policy.',
    decisionContext: 'Memory may suggest investigation steps only. Assess current evidence and use neutral, non-accusatory language.',
    authorizationNote: 'Do not infer guilt or suspicion from prior incidents.'
  }
];

