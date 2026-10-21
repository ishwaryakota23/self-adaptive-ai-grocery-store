import { MemoryAvailability, MemoryConnectionState } from './nativeMemoryService.js';

export function memoryConnectionLabel(state?: MemoryConnectionState, checking = false): string {
  if (checking) return 'CHECKING...';
  if (state === 'connected') return 'MEMORY ONLINE';
  if (state === 'configuration_missing') return 'CONFIGURATION MISSING';
  return 'SERVICE UNAVAILABLE';
}

export function memoryAvailabilityLabel(availability?: MemoryAvailability): string {
  if (availability === 'available') return 'Available';
  if (availability === 'unavailable') return 'Bank unavailable';
  return 'Not verified';
}



