import { db } from './db.js';
import { cartService } from './cartService.js';
import { missionService } from './missionService.js';
import { eventService } from './eventService.js';
import { storeNavigationService } from './storeNavigationService.js';
import { hindsightService } from './hindsightService.js';
import { Product, CartItem, ShoppingMission, InventoryItem, SubstitutionRecord } from '../types/index.js';

export interface ToolExecutionResult {
  tool_name: string;
  success: boolean;
  result: any;
  error?: string;
}

export const GROQ_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description: 'Search catalog by keyword or name',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Product search query' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkAvailability',
      description: 'Check physical stock and availability of a product',
      parameters: {
        type: 'object',
        properties: { productIdOrName: { type: 'string', description: 'Product ID or name' } },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getShelfLocation',
      description: 'Get physical aisle and shelf location',
      parameters: {
        type: 'object',
        properties: { productIdOrName: { type: 'string', description: 'Product ID or name' } },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductSubstitutes',
      description: 'Find in-stock substitutes if an item is out of stock',
      parameters: {
        type: 'object',
        properties: { productIdOrName: { type: 'string', description: 'Unavailable product name or ID' } },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentPrice',
      description: 'Get product price and unit',
      parameters: {
        type: 'object',
        properties: { productIdOrName: { type: 'string', description: 'Product ID or name' } },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addToCart',
      description: 'Add an item to the customer cart by product name or ID',
      parameters: {
        type: 'object',
        properties: {
          productIdOrName: { type: 'string', description: 'Product name (e.g. "brown bread", "milk", "pasta") or product ID' },
          quantity: { type: 'number', description: 'Quantity (default 1)' },
          sessionId: { type: 'string', description: 'Session ID (optional)' }
        },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCart',
      description: 'Get items currently in cart and total',
      parameters: {
        type: 'object',
        properties: { sessionId: { type: 'string', description: 'Session ID' } },
        required: ['sessionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getRouteToProduct',
      description: 'Get route navigation instructions to product shelf',
      parameters: {
        type: 'object',
        properties: { productIdOrName: { type: 'string', description: 'Product ID or name' } },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'removeFromCart',
      description: 'Remove an item from the customer cart by product name or ID',
      parameters: {
        type: 'object',
        properties: {
          productIdOrName: { type: 'string', description: 'Product name or ID to remove' },
          sessionId: { type: 'string', description: 'Session ID (optional)' }
        },
        required: ['productIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateCartQuantity',
      description: 'Update the quantity of an existing item in the cart',
      parameters: {
        type: 'object',
        properties: {
          productIdOrName: { type: 'string', description: 'Product name or ID' },
          quantity: { type: 'number', description: 'New quantity' },
          sessionId: { type: 'string', description: 'Session ID (optional)' }
        },
        required: ['productIdOrName', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCustomerMission',
      description: 'Get active mission checklist for customer',
      parameters: {
        type: 'object',
        properties: { sessionId: { type: 'string', description: 'Session ID' } },
        required: ['sessionId']
      }
    }
  }
];

// Helper to find product by id or fuzzy name
function findProduct(query: string): Product | undefined {
  const clean = query.trim().toLowerCase();
  const all = db.getProducts();

  // Exact ID
  const byId = all.find(p => p.id.toLowerCase() === clean);
  if (byId) return byId;

  // Exact or contains name
  const byName = all.find(p => p.name.toLowerCase() === clean);
  if (byName) return byName;

  // Category-level requests with multiple SKUs must remain unresolved. The
  // cart actions below turn this into a clarification instead of picking the
  // first brand in catalogue order.
  if (/\b(brown bread|whole wheat bread|wheat bread|bread|toast|roti|milk|doodh|paalu|pasta|macaroni|curd|dahi|perugu|yogurt|ice cream|icecream|dessert|chocolate|chocolates|biscuit|biscuits|cookie|cookies|noodles)\b/.test(clean)
    && !/\b(english oven|modern|britannia|barilla|del monte|nandini|country delight|amul|milky mist|mother dairy|cornetto|havmor|ferrero|kitkat|parle|oreo|mcvities|maggi)\b/.test(clean)) return undefined;

  // Partial name
  const partial = all.find(p => p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase()));
  if (partial) return partial;

  // Keyword in tags or description
  const byTag = all.find(p => p.tags.some(t => clean.includes(t.toLowerCase())) || p.description.toLowerCase().includes(clean));
  if (byTag) return byTag;

  // Common synonym and specific category mappings
  if (clean.includes('brown bread') || clean.includes('whole wheat bread') || clean.includes('wheat bread')) {
    return all.find(p => p.id === 'prod-bread-english-oven') || all.find(p => p.id === 'prod-bread-modern-brown') || all.find(p => p.id === 'prod-bread');
  }
  if (clean.includes('english oven')) {
    return all.find(p => p.id === 'prod-bread-english-oven');
  }
  if (clean.includes('modern bread') || clean.includes('modern brown')) {
    return all.find(p => p.id === 'prod-bread-modern-brown');
  }
  if (clean.includes('britannia')) {
    return all.find(p => p.id === 'prod-bread-britannia-wheat');
  }
  if (clean.includes('bread') || clean.includes('toast') || clean.includes('roti')) {
    return all.find(p => p.id === 'prod-bread-english-oven') || all.find(p => p.id === 'prod-bread');
  }
  if (clean.includes('barilla') || clean.includes('penne')) {
    return all.find(p => p.id === 'prod-pasta-barilla-penne') || all.find(p => p.id === 'prod-pasta');
  }
  if (clean.includes('fusilli') || clean.includes('del monte')) {
    return all.find(p => p.id === 'prod-pasta-delmonte-fusilli') || all.find(p => p.id === 'prod-pasta');
  }
  if (clean.includes('pasta') || clean.includes('macaroni')) {
    return all.find(p => p.id === 'prod-pasta-barilla-penne') || all.find(p => p.id === 'prod-pasta');
  }
  if (clean.includes('spinach') || clean.includes('palak') || clean.includes('koora')) {
    return all.find(p => p.id === 'prod-spinach');
  }
  if (clean.includes('broccoli')) {
    return all.find(p => p.id === 'prod-broccoli');
  }
  if (clean.includes('carrot') || clean.includes('gajar') || clean.includes('carrots')) {
    return all.find(p => p.id === 'prod-carrots');
  }
  if (clean.includes('capsicum') || clean.includes('bell pepper') || clean.includes('mirchi')) {
    return all.find(p => p.id === 'prod-capsicum');
  }
  if (clean.includes('potato') || clean.includes('potatoes') || clean.includes('aloo') || clean.includes('bangaladumpa')) {
    return all.find(p => p.id === 'prod-potatoes');
  }
  if (clean.includes('nandini')) {
    return all.find(p => p.id === 'prod-nandini-milk');
  }
  if (clean.includes('country delight')) {
    return all.find(p => p.id === 'prod-country-delight-milk');
  }
  if (clean.includes('gold milk') || clean.includes('full cream')) {
    return all.find(p => p.id === 'prod-amul-gold-milk');
  }
  if (clean.includes('milk') || clean.includes('doodh') || clean.includes('paalu')) {
    return all.find(p => p.id === 'prod-taaza-milk-500ml') || all.find(p => p.id === 'prod-nandini-milk') || all.find(p => p.id === 'prod-taaza-milk');
  }
  if (clean.includes('milky mist curd')) {
    return all.find(p => p.id === 'prod-curd-milky-mist');
  }
  if (clean.includes('mother dairy')) {
    return all.find(p => p.id === 'prod-curd-mother-dairy');
  }
  if (clean.includes('curd') || clean.includes('dahi') || clean.includes('perugu') || clean.includes('yogurt')) {
    return all.find(p => p.id === 'prod-curd') || all.find(p => p.id === 'prod-curd-milky-mist') || all.find(p => p.id === 'prod-curd-mother-dairy');
  }
  if (clean.includes('vanilla') || clean.includes('amul vanilla')) {
    return all.find(p => p.id === 'prod-amul-vanilla');
  }
  if (clean.includes('cornetto')) {
    return all.find(p => p.id === 'prod-cornetto-choco');
  }
  if (clean.includes('havmor') || clean.includes('belgian')) {
    return all.find(p => p.id === 'prod-havmor-belgian');
  }
  if (clean.includes('ice cream') || clean.includes('icecream') || clean.includes('dessert')) {
    return all.find(p => p.id === 'prod-amul-vanilla') || all.find(p => p.id === 'prod-cornetto-choco');
  }
  if (clean.includes('silk') || clean.includes('dairy milk')) {
    return all.find(p => p.id === 'prod-cadbury-silk');
  }
  if (clean.includes('ferrero') || clean.includes('rocher')) {
    return all.find(p => p.id === 'prod-ferrero-rocher');
  }
  if (clean.includes('kitkat') || clean.includes('kit kat')) {
    return all.find(p => p.id === 'prod-kitkat-share');
  }
  if (clean.includes('dark chocolate')) {
    return all.find(p => p.id === 'prod-amul-dark-choco');
  }
  if (clean.includes('chocolate') || clean.includes('chocolates') || clean.includes('mithai')) {
    return all.find(p => p.id === 'prod-cadbury-silk') || all.find(p => p.id === 'prod-kitkat-share');
  }
  if (clean.includes('dark fantasy')) {
    return all.find(p => p.id === 'prod-dark-fantasy');
  }
  if (clean.includes('digestive') || clean.includes('mcvities')) {
    return all.find(p => p.id === 'prod-mcvities-digestive');
  }
  if (clean.includes('parle') || clean.includes('parle-g')) {
    return all.find(p => p.id === 'prod-parleg-250g');
  }
  if (clean.includes('good day') || clean.includes('goodday')) {
    return all.find(p => p.id === 'prod-goodday-200g');
  }
  if (clean.includes('oreo')) {
    return all.find(p => p.id === 'prod-oreo-120g');
  }
  if (clean.includes('biscuit') || clean.includes('biscuits') || clean.includes('cookie') || clean.includes('cookies')) {
    return all.find(p => p.id === 'prod-parleg-250g') || all.find(p => p.id === 'prod-goodday-200g');
  }
  if (clean.includes('maggi') || clean.includes('noodles')) {
    return all.find(p => p.id === 'prod-maggi-70g') || all.find(p => p.id === 'prod-maggi-280g');
  }
  if (clean.includes('nutella')) {
    return all.find(p => p.id === 'prod-nutella-350g');
  }
  if (clean.includes('paneer')) {
    return all.find(p => p.id === 'prod-paneer');
  }
  if (clean.includes('olive') || clean.includes('oil')) {
    return all.find(p => p.id === 'prod-oliveoil') || all.find(p => p.id === 'prod-fortune-oil-1l');
  }
  if (clean.includes('tomato')) {
    return all.find(p => p.id === 'prod-tomatoes');
  }
  if (clean.includes('onion')) {
    return all.find(p => p.id === 'prod-onions');
  }
  if (clean.includes('cheese')) {
    return all.find(p => p.id === 'prod-cheese') || all.find(p => p.id === 'prod-cheese-100g');
  }
  if (clean.includes('tofu')) {
    return all.find(p => p.id === 'prod-tofu');
  }

  return undefined;
}

function ambiguousProductMessage(query: string): string | undefined {
  const words = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 1 && !['the', 'a', 'an', 'please', 'cart', 'basket'].includes(word));
  if (!words.length) return undefined;
  const matches = db.getProducts().filter(product => words.every(word =>
    `${product.name} ${product.brand} ${product.tags.join(' ')}`.toLowerCase().includes(word)
  ));
  const unique = [...new Map(matches.map(product => [product.id, product])).values()];
  if (unique.length < 2) return undefined;
  return `Several products match "${query}": ${unique.slice(0, 4).map(product => `${product.name} (₹${product.price})`).join(' or ')}. Ask the customer which one they mean.`;
}

export async function executeCustomerAgentTool(
  toolName: string,
  args: Record<string, any>,
  fallbackSessionId = 'USER00001',
  authenticatedCustomerId = ''
): Promise<ToolExecutionResult> {
  const sessionId = args.sessionId || fallbackSessionId;

  try {
    switch (toolName) {
      // 1. searchProducts
      case 'searchProducts': {
        const query = (args.query || '').toLowerCase().trim();
        const all = db.getProducts();
        const filtered = all.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.tags.some(t => t.toLowerCase().includes(query)) ||
          p.description.toLowerCase().includes(query) ||
          (args.category && p.category_name?.toLowerCase().includes(args.category.toLowerCase()))
        );

        const ranked = filtered;

        eventService.recordEvent({
          event_type: 'PRODUCT_SEARCH',
          customer_session_id: sessionId,
          metadata: { query, resultsCount: ranked.length }
        });

        return {
          tool_name: toolName,
          success: true,
          result: {
            query,
            totalFound: ranked.length,
            products: ranked.map(p => ({
              id: p.id,
              sku_id: p.sku_id,
              name: p.name,
              brand: p.brand,
              price: p.price,
              aisle: p.aisle,
              shelf_location: p.shelf_location,
              in_stock: (db.getInventoryByProductId(p.id)?.quantity || 0) > 0,
              reasonBadge: (p as any).reasonBadge,
              isPreferred: !!(p as any).reasonBadge?.includes('⭐'),
              isDeprioritized: !!(p as any).isDeprioritized,
              personalizedScore: (p as any).personalizedScore
            }))
          }
        };
      }

      // 2. getProductDetails
      case 'getProductDetails': {
        const prod = findProduct(args.productId);
        if (!prod) {
          return { tool_name: toolName, success: false, result: null, error: `Product not found: ${args.productId}` };
        }
        const inv = db.getInventoryByProductId(prod.id);
        eventService.recordEvent({
          event_type: 'PRODUCT_DETAIL_VIEW',
          customer_session_id: sessionId,
          product_id: prod.id,
          product_name: prod.name
        });
        return {
          tool_name: toolName,
          success: true,
          result: {
            ...prod,
            inventory_status: inv?.status,
            available_quantity: inv?.quantity || 0
          }
        };
      }

      // 3. checkAvailability
      case 'checkAvailability': {
        const target = findProduct(args.productIdOrName);
        if (!target) {
          return {
            tool_name: toolName,
            success: true,
            result: {
              requested: args.productIdOrName,
              found: false,
              available: false,
              message: `Product "${args.productIdOrName}" is not listed in store catalog.`
            }
          };
        }
        const inv = db.getInventoryByProductId(target.id);
        const qty = inv?.quantity || 0;
        const available = qty > 0;

        eventService.recordEvent({
          event_type: 'AVAILABILITY_CHECK',
          customer_session_id: sessionId,
          product_id: target.id,
          product_name: target.name,
          metadata: { available, stock: qty }
        });

        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            productName: target.name,
            available,
            isAvailable: available,
            stock: qty,
            stockQuantity: qty,
            status: inv?.status || (available ? 'in_stock' : 'out_of_stock'),
            price: target.price,
            aisle: target.aisle,
            shelf_location: target.shelf_location
          }
        };
      }

      // 4. getShelfLocation
      case 'getShelfLocation': {
        const target = findProduct(args.productIdOrName);
        if (!target) {
          return { tool_name: toolName, success: false, result: null, error: `Could not identify product "${args.productIdOrName}"` };
        }
        const calcRoute = storeNavigationService.calculateRouteToProduct(target);
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            name: target.name,
            aisle: target.aisle,
            shelf_location: target.shelf_location,
            distanceMeters: calcRoute.totalDistanceMeters,
            walkingTimeFormatted: calcRoute.estimatedWalkingMinutesFormatted,
            mapRoute: `/customer/map?product=${target.id}`
          }
        };
      }

      // 5. getProductSubstitutes (DYNAMIC SUBSTITUTION - Section 14)
      case 'getProductSubstitutes': {
        const target = findProduct(args.productIdOrName);
        const allProducts = db.getProducts();
        const allInventory = db.getInventory();

        let targetCategory = target?.category_id || 'cat-1';
        let targetId = target?.id;

        // Dynamic candidate filtering: Same category, inventory > 0, excluding target
        let candidates = allProducts.filter(p => {
          if (p.id === targetId) return false;
          const inv = allInventory.find(i => i.product_id === p.id);
          const isStocked = (inv?.quantity || 0) > 0;
          return isStocked && (p.category_id === targetCategory || (target && p.category_name === target.category_name));
        });

        // If no candidate in exact category, expand to complementary categories
        if (candidates.length === 0) {
          candidates = allProducts.filter(p => {
            if (p.id === targetId) return false;
            const inv = allInventory.find(i => i.product_id === p.id);
            return (inv?.quantity || 0) > 0;
          });
        }

        // Dynamic Customer Hindsight Recall for previously accepted substitutes
        let pastAcceptedSubName = '';
        try {
          if (authenticatedCustomerId) {
            const memories = await hindsightService.recallCustomerMemories(
              authenticatedCustomerId,
              `${target?.name || args.productIdOrName} substitute oats accepted`
            );
            for (const m of memories.results || []) {
              const mText = m.text.toLowerCase();
              const candidate = candidates.find(c => mText.includes(c.name.toLowerCase()));
              if (candidate && /accepted substitute|substitute accepted|accepted .*substitut/.test(mText)) pastAcceptedSubName = candidate.name.toLowerCase();
            }
          }
        } catch {}

        // Also check db substitutions for this customer session/account
        const pastDbSub = db.getSubstitutions().find(s =>
          (s.customer_session_id === sessionId || s.requested_product_name.toLowerCase().includes('oats') || (target && s.requested_product_name.toLowerCase() === target.name.toLowerCase())) &&
          s.substitute_accepted
        );
        if (pastDbSub) {
          pastAcceptedSubName = pastDbSub.substitute_product_name.toLowerCase();
        }

        // Rank candidates by tag similarity and rating, boosting prior accepted substitute
        const targetTags = new Set(target?.tags || []);
        const scoredCandidates = candidates.map(c => {
          let score = c.rating || 4.0;
          for (const t of c.tags) {
            if (targetTags.has(t)) score += 1.5;
          }

          // Boost only a substitute named by a real stored customer memory or DB record.
          const isPreviouslyAccepted = !!pastAcceptedSubName && c.name.toLowerCase().includes(pastAcceptedSubName);

          if (isPreviouslyAccepted) {
            score += 10.0; // Surface immediately as #1 choice
          }
          return { product: c, score, isPreviouslyAccepted };
        }).sort((a, b) => b.score - a.score);

        const topSubstitutes = scoredCandidates.slice(0, 3).map(s => ({
          ...s.product,
          badge: s.isPreviouslyAccepted ? '🔄 Previously accepted substitute by you' : undefined
        }));

        // Record substitution event in database ledger
        if (topSubstitutes.length > 0) {
          const topOne = topSubstitutes[0];
          db.recordSubstitution({
            customer_session_id: sessionId,
            requested_product_name: target?.name || args.productIdOrName,
            requested_product_available: false,
            substitute_product_id: topOne.id,
            substitute_product_name: topOne.name,
            substitute_suggested: true,
            substitute_accepted: false,
            substitute_purchased: false,
            quantity: 1
          });
        }

        return {
          tool_name: toolName,
          success: true,
          result: {
            requestedProduct: target?.name || args.productIdOrName,
            isUnavailable: true,
            substitutes: topSubstitutes.map(s => ({
              id: s.id,
              name: s.name,
              price: s.price,
              aisle: s.aisle,
              shelf_location: s.shelf_location,
              image_url: s.image_url,
              tags: s.tags,
              in_stock_qty: db.getInventoryByProductId(s.id)?.quantity || 0,
              badge: s.badge
            }))
          }
        };
      }

      // 6. getCurrentPrice
      case 'getCurrentPrice': {
        const target = findProduct(args.productIdOrName);
        if (!target) {
          return { tool_name: toolName, success: false, result: null, error: `Product not found: "${args.productIdOrName}"` };
        }
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            name: target.name,
            price: target.price,
            original_price: target.original_price,
            discount_percentage: target.discount_percentage,
            weight_or_volume: target.weight_or_volume
          }
        };
      }

      // 7. getCart
      case 'getCart': {
        const items = cartService.getCart(sessionId);
        const totals = cartService.getTotals(sessionId);
        return {
          tool_name: toolName,
          success: true,
          result: {
            sessionId,
            itemCount: totals.itemCount,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            items: items.map(i => ({
              cartItemId: i.id,
              productId: i.product_id,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
              itemTotal: i.product.price * i.quantity
            }))
          }
        };
      }

      // 8. addToCart
      case 'addToCart': {
        const requested = String(args.productId || args.productIdOrName || '');
        const target = findProduct(requested);
        if (!target) {
          return { tool_name: toolName, success: false, result: null, error: ambiguousProductMessage(requested) || `Product not found: ${requested}` };
        }
        const inv = db.getInventoryByProductId(target.id);
        const availableStock = inv?.quantity || 0;
        const qty = Math.max(1, parseInt(args.quantity) || 1);

        if (availableStock < qty) {
          return {
            tool_name: toolName,
            success: false,
            result: null,
            error: `Only ${availableStock} units of ${target.name} available in stock. Cannot add ${qty}.`
          };
        }

        const cartItem = cartService.addToCart(target, qty, sessionId, 'LARGE_DISPLAY');
        const totals = cartService.getTotals(sessionId);

        // Retain positive preference into Customer Hindsight
        try {
          if (authenticatedCustomerId) await hindsightService.retainCustomerPreferenceExperience(authenticatedCustomerId, target.name, true, 0.88);
        } catch {}

        // If adding an item that fulfills a substitution, record acceptance and retain in Hindsight
        const subs = db.getSubstitutions();
        const pendingSub = subs.find(s => s.customer_session_id === sessionId && s.substitute_product_id === target.id && !s.substitute_accepted);
        if (pendingSub) {
          db.recordSubstitutionAccepted(pendingSub.id, sessionId);
          try {
            if (authenticatedCustomerId) await hindsightService.retainCustomerSubstitutionExperience(
              authenticatedCustomerId,
              pendingSub.requested_product_name,
              target.name,
              true
            );
          } catch {}
        }

        return {
          tool_name: toolName,
          success: true,
          result: {
            added: {
              productId: target.id,
              name: target.name,
              quantity: qty,
              unitPrice: target.price,
              subtotal: target.price * qty
            },
            cartTotal: totals.total,
            cartItemCount: totals.itemCount,
            totalItems: totals.itemCount,
            itemCount: totals.itemCount
          }
        };
      }

      // 9. removeFromCart
      case 'removeFromCart': {
        const requested = String(args.productId || args.productIdOrName || '');
        const target = findProduct(requested);
        if (!target && ambiguousProductMessage(requested)) return { tool_name: toolName, success: false, result: null, error: ambiguousProductMessage(requested) };
        const currentCart = cartService.getCart(sessionId);
        const item = currentCart.find(c => c.product_id === target?.id || c.id === args.productId || c.product_id === args.productIdOrName);
        if (!item) {
          return { tool_name: toolName, success: false, result: null, error: `Item not present in cart for session ${sessionId}` };
        }
        cartService.removeItem(item.id, sessionId);
        const totals = cartService.getTotals(sessionId);
        return {
          tool_name: toolName,
          success: true,
          result: {
            removedProductId: item.product_id,
            removedName: item.product.name,
            newCartTotal: totals.total,
            remainingItems: totals.itemCount,
            totalItems: totals.itemCount
          }
        };
      }

      // 10. updateCartQuantity
      case 'updateCartQuantity': {
        const requested = String(args.productId || args.productIdOrName || '');
        const target = findProduct(requested);
        if (!target && ambiguousProductMessage(requested)) return { tool_name: toolName, success: false, result: null, error: ambiguousProductMessage(requested) };
        const currentCart = cartService.getCart(sessionId);
        const item = currentCart.find(c => c.product_id === target?.id || c.id === args.productId || c.product_id === args.productIdOrName);
        if (!item) {
          return { tool_name: toolName, success: false, result: null, error: `Item not in cart to update.` };
        }
        const delta = (args.quantity || 1) - item.quantity;
        cartService.updateQuantity(item.id, delta, sessionId);
        const totals = cartService.getTotals(sessionId);
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: item.product_id,
            name: item.product.name,
            newQuantity: args.quantity,
            cartTotal: totals.total,
            totalItems: totals.itemCount
          }
        };
      }

      // 11. getCustomerMission
      case 'getCustomerMission': {
        const mission = missionService.getActiveMission(sessionId);
        if (!mission) {
          return { tool_name: toolName, success: false, result: null, error: `No active mission for session ${sessionId}` };
        }
        const progress = missionService.getProgress(mission);
        return {
          tool_name: toolName,
          success: true,
          result: {
            id: mission.id,
            name: mission.name,
            missionName: mission.name,
            budget: mission.budget,
            progressPercent: progress.percent,
            foundCount: progress.found,
            totalItems: progress.total,
            itemCount: progress.total,
            items: mission.items.map(i => ({
              id: i.id,
              name: i.product_name,
              status: i.status,
              shelf_location: i.shelf_location || i.aisle
            }))
          }
        };
      }

      // 12. getMissionProgress
      case 'getMissionProgress': {
        const mission = missionService.getActiveMission(sessionId);
        const progress = missionService.getProgress(mission);
        return {
          tool_name: toolName,
          success: true,
          result: {
            missionName: mission?.name,
            percent: progress.percent,
            found: progress.found,
            total: progress.total
          }
        };
      }

      // 13. getRemainingMissionItems
      case 'getRemainingMissionItems': {
        const mission = missionService.getActiveMission(sessionId);
        if (!mission) {
          return { tool_name: toolName, success: false, result: null, error: 'No active mission.' };
        }
        const pending = mission.items.filter(i => i.status !== 'found');
        return {
          tool_name: toolName,
          success: true,
          result: {
            remainingCount: pending.length,
            items: pending.map(i => ({
              id: i.id,
              name: i.product_name,
              location: i.shelf_location || i.aisle,
              quantity: i.quantity
            }))
          }
        };
      }

      // 14. updateMissionItem
      case 'updateMissionItem': {
        missionService.updateItemStatus(args.missionId, args.itemId, args.status);
        return {
          tool_name: toolName,
          success: true,
          result: {
            missionId: args.missionId,
            itemId: args.itemId,
            status: args.status
          }
        };
      }

      // 15. getStoreMapLocation
      case 'getStoreMapLocation': {
        const target = findProduct(args.productIdOrName);
        if (!target) {
          return { tool_name: toolName, success: false, result: null, error: `Product not found: "${args.productIdOrName}"` };
        }
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            name: target.name,
            aisle: target.aisle,
            shelf_location: target.shelf_location,
            mapUrl: `/customer/map?product=${target.id}`
          }
        };
      }

      // 16. getRouteToProduct
      case 'getRouteToProduct': {
        const target = findProduct(args.productIdOrName);
        if (!target) {
          return { tool_name: toolName, success: false, result: null, error: `Product not found: "${args.productIdOrName}"` };
        }
        const calcRoute = storeNavigationService.calculateRouteToProduct(target);
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            name: target.name,
            aisle: target.aisle,
            shelf_location: target.shelf_location,
            distanceMeters: calcRoute.totalDistanceMeters,
            walkingTimeFormatted: calcRoute.estimatedWalkingMinutesFormatted,
            directions: calcRoute.turnByTurnInstructions.join(' -> '),
            steps: calcRoute.turnByTurnInstructions,
            mapUrl: `/customer/map?product=${target.id}`
          }
        };
      }

      // 17. getPersonalizedRecommendations
      case 'getPersonalizedRecommendations': {
        const prefs = db.getCustomerPreferences(sessionId);
        const mission = missionService.getActiveMission(sessionId);
        const allProducts = db.getProducts();

        // Candidates matching dietary preferences, category affinity, or catalog
        const candidates = allProducts.filter(p => {
          if (prefs?.preferred_brands.includes(p.brand)) return true;
          if (prefs?.dietary_preferences.some(d => p.tags.includes(d))) return true;
          return true;
        });

        const ranked = candidates;
        // Prioritize non-deprioritized recommendations
        const nonDeprioritized = ranked.filter(r => !(r as any).isDeprioritized);
        const topRecs = (nonDeprioritized.length >= 3 ? nonDeprioritized : ranked).slice(0, 3);

        return {
          tool_name: toolName,
          success: true,
          result: {
            sessionId,
            recommendations: topRecs.map(r => ({
              id: r.id,
              name: r.name,
              price: r.price,
              reason: (r as any).reasonBadge || `Matches preferences (${prefs?.dietary_preferences.join(', ') || 'Grocery Choice'})`,
              badge: (r as any).reasonBadge,
              aisle: r.aisle,
              personalizedScore: undefined
            }))
          }
        };
      }

      // 18. recordRecommendationResponse
      case 'recordRecommendationResponse': {
        const isAccepted = args.response === 'accepted';
        eventService.recordEvent({
          event_type: isAccepted ? 'RECOMMENDATION_ACCEPTED' : 'RECOMMENDATION_REJECTED',
          customer_session_id: sessionId,
          metadata: { recommendationId: args.recommendationId, productName: args.productName, response: args.response }
        });

        // Retain preference outcome into Customer Hindsight
        const targetName = args.productName || args.recommendationId || '';
        let hindsightRetained = false;
        if (targetName) {
          try {
            const customerId = authenticatedCustomerId;
            if (!customerId) throw new Error('A verified customer identity is required to retain this preference outcome.');
            const retained = await hindsightService.retainCustomerPreferenceExperience(
              customerId,
              targetName,
              isAccepted,
              isAccepted ? 0.88 : 0.82
            );
            hindsightRetained = retained.success;
          } catch {}
        }

        return {
          tool_name: toolName,
          success: true,
            result: { recorded: true, response: args.response, hindsightRetained }
        };
      }

      // 19. createCustomerNotification
      case 'createCustomerNotification': {
        const notif = db.addNotification({
          customer_id: sessionId,
          type: args.type || 'nearby_offer',
          title: args.title,
          message: args.message,
          read: false,
          created_at: 'Just now',
          actions: []
        });
        return {
          tool_name: toolName,
          success: true,
          result: { notificationId: notif.id, title: notif.title }
        };
      }

      // 20. recordCustomerEvent
      case 'recordCustomerEvent': {
        const evt = eventService.recordEvent({
          event_type: args.eventType,
          customer_session_id: sessionId,
          metadata: args.metadata || {}
        });
        return {
          tool_name: toolName,
          success: true,
          result: { eventId: evt.event_id, eventType: evt.event_type }
        };
      }

      default:
        return {
          tool_name: toolName,
          success: false,
          result: null,
          error: `Unknown tool name: ${toolName}`
        };
    }
  } catch (err: any) {
    return {
      tool_name: toolName,
      success: false,
      result: null,
      error: err?.message || 'Tool execution error'
    };
  }
}
