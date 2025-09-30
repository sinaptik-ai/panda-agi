// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

// Authentication Configuration
export const PLATFORM_MODE = process.env.NEXT_PUBLIC_PLATFORM_MODE === 'true';

// External URLs
export const EXTERNAL_URLS = {
  UPGRADE: "https://agi.pandas-ai.com/upgrade",
  DASHBOARD: "https://agi.pandasai.com/dashboard",
} as const;

// You can add more configuration variables here as needed
export const config = {
  api: {
    url: API_URL,
  },
  platform: {
    mode: PLATFORM_MODE,
  },
  external: {
    urls: EXTERNAL_URLS,
  },
  markdown: {
    maxContentLength: 1000,
  },
};

export default config;