import { describe, expect, it } from 'vitest';
import { guestQrPayload, parseGuestQrPayload } from '../src/lib/qr';

describe('guestQrPayload / parseGuestQrPayload', () => {
  it('faz o roundtrip do payload', () => {
    const payload = guestQrPayload('event-123', 'guest-abc');
    expect(payload).toBe('GALERA:event-123:guest-abc');
    expect(parseGuestQrPayload(payload)).toEqual({ eventId: 'event-123', guestId: 'guest-abc' });
  });

  it('rejeita QR de outro app ou corrompido', () => {
    expect(parseGuestQrPayload('https://outro-app.com/convite/123')).toBeNull();
    expect(parseGuestQrPayload('GALERA:só-um-campo')).toBeNull();
    expect(parseGuestQrPayload('')).toBeNull();
  });
});
