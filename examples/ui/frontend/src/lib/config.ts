// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

// Authentication Configuration
export const USE_AUTH = process.env.NEXT_PUBLIC_USE_AUTH === 'true';

// You can add more configuration variables here as needed
export const config = {
  api: {
    url: API_URL,
  },
  auth: {
    enabled: USE_AUTH,
  },
};

export default config;