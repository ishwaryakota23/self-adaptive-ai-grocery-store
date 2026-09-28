import { db } from './db';
import { Order } from '../types';

class OrderService {
  public completeCheckout(paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash', sessionId: string): Order {
    return db.completeCheckout(paymentMethod, sessionId);
  }

  public getOrders(sessionId?: string): Order[] {
    return db.getOrders(sessionId);
  }

  public getOrderById(orderId: string): Order | undefined {
    return db.getOrders().find(o => o.id === orderId);
  }
}

export const orderService = new OrderService();
