import { db } from './db';
import { PaymentRecord, PaymentStatus } from '../types';

class PaymentService {
  public getPayments(sessionId?: string): PaymentRecord[] {
    const payments = db.getPayments();
    if (sessionId) {
      return payments.filter((p: PaymentRecord) => p.customer_session_id === sessionId);
    }
    return payments;
  }

  public recordPaymentFailed(
    sessionId: string,
    paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Cash',
    reason: string
  ): void {
    db.recordPaymentFailed(sessionId, paymentMethod, reason);
  }
}

export const paymentService = new PaymentService();
