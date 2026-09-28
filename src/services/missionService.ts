import { db } from './db';
import { ShoppingMission, ShoppingMissionItem } from '../types';

class MissionService {
  public getActiveMission(sessionId: string): ShoppingMission | undefined {
    return db.getActiveMission(sessionId);
  }

  public updateItemStatus(
    missionId: string,
    itemId: string,
    status: 'found' | 'not_found' | 'in_progress' | 'pending'
  ): void {
    db.updateMissionItemStatus(missionId, itemId, status);
  }

  public getProgress(mission?: ShoppingMission): { total: number; found: number; percent: number } {
    if (!mission || !mission.items.length) {
      return { total: 0, found: 0, percent: 0 };
    }
    const total = mission.items.length;
    const found = mission.items.filter(i => i.status === 'found').length;
    const percent = Math.round((found / total) * 100);
    return { total, found, percent };
  }
}

export const missionService = new MissionService();
