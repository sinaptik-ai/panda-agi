// Utility functions for server URLs

/**
 * Returns the base server host, using REACT_APP_API_HOST
 */
export function get_server_host() {
  return process.env.REACT_APP_API_HOST || "http://localhost";
}

/**
 * Returns the base server URL, using REACT_APP_API_HOST and REACT_APP_API_PORT
 * Defaults to http://localhost:8001 if not set
 */
export function get_server_url() {
  const host = get_server_host();
  const port = process.env.REACT_APP_API_PORT || "8001";
  return `${host}:${port}`;
}

/**
 * Returns the backend server URL for a given path, handling production and development
 * @param {string} path - The path after the base (should start with /)
 * @returns {string}
 */
export function get_backend_server_url(path) {
  return `${get_server_url()}${path}`;
}
