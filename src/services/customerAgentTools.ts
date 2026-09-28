import { db } from './db';
import { cartService } from './cartService';
import { missionService } from './missionService';
import { eventService } from './eventService';
import { Product, CartItem, ShoppingMission, InventoryItem, SubstitutionRecord } from '../types';

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
      description: 'Add an item to the customer cart',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID' },
          quantity: { type: 'number', description: 'Quantity (default 1)' },
          sessionId: { type: 'string', description: 'Session ID' }
        },
        required: ['productId', 'sessionId']
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

  // Partial name
  const partial = all.find(p => p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase()));
  if (partial) return partial;

  // Keyword in tags or description
  const byTag = all.find(p => p.tags.some(t => clean.includes(t.toLowerCase())) || p.description.toLowerCase().includes(clean));
  if (byTag) return byTag;

  // Common synonym mapping
  if (clean.includes('milk') || clean.includes('doodh') || clean.includes('paalu')) {
    return all.find(p => p.id === 'prod-taaza-milk');
  }
  if (clean.includes('curd') || clean.includes('dahi') || clean.includes('perugu')) {
    return all.find(p => p.id === 'prod-curd');
  }
  if (clean.includes('paneer')) {
    return all.find(p => p.id === 'prod-paneer');
  }
  if (clean.includes('bread')) {
    return all.find(p => p.id === 'prod-bread');
  }
  if (clean.includes('pasta')) {
    return all.find(p => p.id === 'prod-pasta');
  }
  if (clean.includes('olive') || clean.includes('oil')) {
    return all.find(p => p.id === 'prod-oliveoil');
  }
  if (clean.includes('tomato')) {
    return all.find(p => p.id === 'prod-tomatoes');
  }
  if (clean.includes('onion')) {
    return all.find(p => p.id === 'prod-onions');
  }
  if (clean.includes('cheese')) {
    return all.find(p => p.id === 'prod-cheese');
  }
  if (clean.includes('tofu')) {
    return all.find(p => p.id === 'prod-tofu');
  }
  if (clean.includes('yogurt')) {
    return all.find(p => p.id === 'prod-greekyogurt');
  }

  return undefined;
}

export async function executeCustomerAgentTool(
  toolName: string,
  args: Record<string, any>,
  fallbackSessionId = 'USER00001'
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

        eventService.recordEvent({
          event_type: 'PRODUCT_SEARCH',
          customer_session_id: sessionId,
          metadata: { query, resultsCount: filtered.length }
        });

        return {
          tool_name: toolName,
          success: true,
          result: {
            query,
            totalFound: filtered.length,
            products: filtered.map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
              aisle: p.aisle,
              shelf_location: p.shelf_location,
              in_stock: (db.getInventoryByProductId(p.id)?.quantity || 0) > 0
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
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            name: target.name,
            aisle: target.aisle,
            shelf_location: target.shelf_location,
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

        // Rank candidates by tag similarity and rating
        const targetTags = new Set(target?.tags || []);
        const scoredCandidates = candidates.map(c => {
          let score = c.rating || 4.0;
          for (const t of c.tags) {
            if (targetTags.has(t)) score += 1.5;
          }
          return { product: c, score };
        }).sort((a, b) => b.score - a.score);

        const topSubstitutes = scoredCandidates.slice(0, 3).map(s => s.product);

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
              in_stock_qty: db.getInventoryByProductId(s.id)?.quantity || 0
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
        const target = findProduct(args.productId || args.productIdOrName);
        if (!target) {
          return { tool_name: toolName, success: false, result: null, error: `Product not found: ${args.productId || args.productIdOrName}` };
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

        // If adding an item that fulfills a substitution, record acceptance
        const subs = db.getSubstitutions();
        const pendingSub = subs.find(s => s.customer_session_id === sessionId && s.substitute_product_id === target.id && !s.substitute_accepted);
        if (pendingSub) {
          db.recordSubstitutionAccepted(pendingSub.id, sessionId);
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
        const target = findProduct(args.productId || args.productIdOrName);
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
        const target = findProduct(args.productId || args.productIdOrName);
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
        const routeSteps = [
          'Start from Store Entrance',
          'Walk straight past Produce Section',
          `Turn into ${target.aisle}`,
          `Locate shelf: ${target.shelf_location}`
        ];
        return {
          tool_name: toolName,
          success: true,
          result: {
            productId: target.id,
            name: target.name,
            aisle: target.aisle,
            directions: `Start from Store Entrance -> Walk straight past Produce Section -> Turn into ${target.aisle} -> Locate shelf: ${target.shelf_location}.`,
            steps: routeSteps,
            mapUrl: `/customer/map?product=${target.id}`
          }
        };
      }

      // 17. getPersonalizedRecommendations
      case 'getPersonalizedRecommendations': {
        const prefs = db.getCustomerPreferences(sessionId);
        const mission = missionService.getActiveMission(sessionId);
        const allProducts = db.getProducts();

        // Recommend products matching dietary preferences or complementary to mission items
        const recommended = allProducts.filter(p => {
          if (prefs?.preferred_brands.includes(p.brand)) return true;
          if (prefs?.dietary_preferences.some(d => p.tags.includes(d))) return true;
          return false;
        }).slice(0, 3);

        return {
          tool_name: toolName,
          success: true,
          result: {
            sessionId,
            recommendations: recommended.map(r => ({
              id: r.id,
              name: r.name,
              price: r.price,
              reason: `Matches dietary preferences (${prefs?.dietary_preferences.join(', ') || 'Grocery Choice'})`,
              aisle: r.aisle
            }))
          }
        };
      }

      // 18. recordRecommendationResponse
      case 'recordRecommendationResponse': {
        eventService.recordEvent({
          event_type: args.response === 'accepted' ? 'RECOMMENDATION_ACCEPTED' : 'RECOMMENDATION_REJECTED',
          customer_session_id: sessionId,
          metadata: { recommendationId: args.recommendationId, response: args.response }
        });
        return {
          tool_name: toolName,
          success: true,
          result: { recorded: true, response: args.response }
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
