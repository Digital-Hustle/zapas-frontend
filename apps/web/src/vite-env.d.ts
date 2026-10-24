/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PREVIEW_MOCKS?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_PROXY_TARGET?: string;
}
