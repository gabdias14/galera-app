import QRCode from 'qrcode';

const PREFIX = 'GALERA';

/** Formato do QR: simples de sobra — é só um ponteiro pro registro do convidado. */
export function guestQrPayload(eventId: string, guestId: string): string {
  return `${PREFIX}:${eventId}:${guestId}`;
}

export function parseGuestQrPayload(text: string): { eventId: string; guestId: string } | null {
  const parts = text.trim().split(':');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  return { eventId: parts[1], guestId: parts[2] };
}

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 260,
    color: { dark: '#1B1030', light: '#FFFCF9' },
  });
}

/** `true` só quando dá pra escanear de verdade neste navegador (câmera + leitor nativo). */
export function scannerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    'BarcodeDetector' in window
  );
}
