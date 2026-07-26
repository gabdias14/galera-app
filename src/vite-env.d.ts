/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Base usada nos links de convite compartilhados (ex.: https://galera.app). */
  readonly VITE_PUBLIC_URL?: string;
  /** 'true' só no build do demo público (GitHub Pages) — liga o aviso de modo demonstração. */
  readonly VITE_DEMO_MODE?: string;
  /** Site ID do GoatCounter pro build do demo público (ex.: 'galera-demo'). Sem isso, não carrega analytics. */
  readonly VITE_GOATCOUNTER_SITE?: string;
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
