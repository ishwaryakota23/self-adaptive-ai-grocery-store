import { db } from './db.js';
import { NotificationItem } from '../types/index.js';

class NotificationService {
  public getNotifications(sessionId: string): NotificationItem[] {
    return db.getNotifications(sessionId);
  }

  public markRead(notificationId: string): void {
    db.markNotificationRead(notificationId);
  }

  public addNotification(notif: Omit<NotificationItem, 'id'>): NotificationItem {
    return db.addNotification(notif);
  }

  public getUnreadCount(sessionId: string): number {
    return db.getNotifications(sessionId).filter(n => !n.read).length;
  }
}

export const notificationService = new NotificationService();
