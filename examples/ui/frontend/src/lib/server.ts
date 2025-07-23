// Utility functions for server URLs
import { API_URL } from './config';

/**
 * Returns the base server URL, using NEXT_PUBLIC_API_HOST and NEXT_PUBLIC_API_PORT
 * Defaults to http://localhost:8001 if not set
 */
export function getServerURL() {
    return API_URL;
  }

/**
 * Returns the backend server URL for a given path, handling production and development
 * @param {string} path - The path after the base (should start with /)
 * @returns {string}
 */
export function getBackendServerURL(path: string) {
  return `${getServerURL()}${path}`;
}
