/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_GOOGLE_MAPS_KEY?: string;
  readonly VITE_FEATURE_FINANCE_MARKETPLACE?: string;
  readonly VITE_FEATURE_FINANCE_ELIGIBILITY_API?: string;
  readonly VITE_FEATURE_FINANCE_COMPARE_API?: string;
  readonly VITE_FEATURE_FINANCE_SOFT_APPROVAL?: string;
  readonly VITE_FEATURE_FINANCE_DOCUMENTS_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
