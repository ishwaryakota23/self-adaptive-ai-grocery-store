import { HindsightBankAvailability, HindsightConnectionState } from './hindsightService.js';

export function hindsightConnectionLabel(state?: HindsightConnectionState, checking = false): string {
  if (checking) return 'CHECKING...';
  if (state === 'connected') return 'HINDSIGHT CONNECTED';
  if (state === 'configuration_missing') return 'CONFIGURATION MISSING';
  if (state === 'authentication_failed') return 'AUTHENTICATION FAILED';
  if (state === 'network_unreachable') return 'NETWORK UNREACHABLE';
  if (state === 'endpoint_unsupported') return 'ENDPOINT UNSUPPORTED';
  if (state === 'sdk_incompatible') return 'SDK INCOMPATIBLE';
  if (state === 'http_error') return 'HTTP ERROR';
  return 'SERVICE UNAVAILABLE';
}

export function hindsightBankAvailabilityLabel(availability?: HindsightBankAvailability): string {
  if (availability === 'available') return 'Available';
  if (availability === 'unavailable') return 'Bank unavailable';
  return 'Not verified';
}
