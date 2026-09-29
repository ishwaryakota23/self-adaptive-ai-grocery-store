import { db } from './db.js';
import { CartItem, Product } from '../types/index.js';

class CartService {
  public getCart(sessionId: string): CartItem[] {
    return db.getCart(sessionId);
  }

  public addToCart(
    product: Product,
    quantity = 1,
    sessionId: string,
    source: 'LARGE_DISPLAY' | 'MOBILE' = 'LARGE_DISPLAY'
  ): CartItem {
    return db.addToCart(product, quantity, sessionId, source);
  }

  public updateQuantity(cartItemId: string, delta: number, sessionId?: string): void {
    db.updateCartItemQuantity(cartItemId, delta, sessionId);
  }

  public removeItem(cartItemId: string, sessionId?: string): void {
    db.removeCartItem(cartItemId, sessionId);
  }

  public clearCart(sessionId: string): void {
    db.clearCart(sessionId);
  }

  public getTotals(sessionId: string): { subtotal: number; tax: number; total: number; itemCount: number } {
    const items = db.getCart(sessionId);
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, tax, total, itemCount };
  }
}

export const cartService = new CartService();
