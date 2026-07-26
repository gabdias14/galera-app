/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Base usada nos links de convite compartilhados (ex.: https://galera.app). */
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Ainda fora do lib.dom.d.ts do TS — suportado no Chrome/Android, não no Safari/iOS. */
interface BarcodeDetectorOptions {
  formats: string[];
}
interface DetectedBarcode {
  rawValue: string;
}
declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
