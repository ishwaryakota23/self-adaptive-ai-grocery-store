import { db } from './db.js';
import { InventoryItem, InventoryMovement } from '../types/index.js';

class InventoryService {
  public getInventory(): InventoryItem[] {
    return db.getInventory();
  }

  public getInventoryByProductId(productId: string): InventoryItem | undefined {
    return db.getInventoryByProductId(productId);
  }

  public restock(productId: string, quantityToAdd: number, reason = 'Manager restock'): void {
    db.restockProduct(productId, quantityToAdd, reason);
  }

  public getMovements(productId?: string): InventoryMovement[] {
    return db.getInventoryMovements(productId);
  }

  public getStockouts(): InventoryItem[] {
    return db.getInventory().filter(i => i.quantity === 0);
  }

  public getLowStockItems(): InventoryItem[] {
    return db.getInventory().filter(i => i.quantity > 0 && i.quantity <= i.reorder_threshold);
  }
}

export const inventoryService = new InventoryService();
