import { db } from './db.js';
import { eventService } from './eventService.js';
import { DemandFunnelSummary, SaleRecord, AisleTraffic, CheckoutQueue } from '../types/index.js';

class AnalyticsService {
  public getDemandFunnel(productId?: string): DemandFunnelSummary {
    return eventService.calculateDemandFunnel(productId);
  }

  public getSalesRecords(): SaleRecord[] {
    return db.getSales();
  }

  public getTotalSales(): number {
    return db.getSales().reduce((sum: number, s: SaleRecord) => sum + s.total_amount, 0);
  }

  public getAisleTraffic(): AisleTraffic[] {
    return db.getAisleTraffic();
  }

  public getCheckoutQueues(): CheckoutQueue[] {
    return db.getCheckoutQueues();
  }
}

export const analyticsService = new AnalyticsService();
