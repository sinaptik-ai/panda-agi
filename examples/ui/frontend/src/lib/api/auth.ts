import { getServerURL } from "@/lib/server";
import { PLATFORM_MODE } from "@/lib/config";

/**
 * Cookie utility functions
 */
const COOKIE_NAME = "auth_token";
const COOKIE_EXPIRY_DAYS = 30;

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  // For development, we need to set cookies that work across localhost ports
  // In production, you would set the domain to your actual domain
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const domain = isLocalhost ? '' : `;domain=${window.location.hostname}`;
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax${domain}`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Validates the authentication token
 * @param token - The token to validate
 * @returns True if the token is valid
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${getServerURL()}/public/auth/validate`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

/**
 * Gets the GitHub authentication URL from the backend
 * @returns The GitHub authentication URL if successful
 */
export async function getGitHubAuthUrl(): Promise<string | null> {
  try {
    // Get the current host and construct the redirect URI
    const currentHost = window.location.origin;
    const redirectUri = `${currentHost}/authenticate`;
    
    // Pass the redirect URI as a query parameter
    const response = await fetch(`${getServerURL()}/public/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`, {
      credentials: 'include'
    });
    const data = await response.json();

    if (data && data.auth_url) {
      return data.auth_url;
    } else {
      console.error("GitHub authentication URL not found in response:", data);
      throw new Error("GitHub authentication URL not found in response, try again later");
    }
  } catch (error) {
    console.error("Failed to fetch GitHub authentication URL:", error);
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        throw new Error("Server is not responding. Please try again in a few minutes.");
      }
      throw new Error(error.message);
    }
    throw new Error("Failed to fetch GitHub authentication URL, try again later");
  }
}

/**
 * Auth token interface
 */
export interface AuthToken {
  access_token: string;
  expires_at?: string | null;
  expires_in?: string | null;
  refresh_token?: string | null;
  token_type?: string | null;
  provider_token?: string | null;
}

/**
 * Stores the authentication token in both local storage and cookies
 * @param token - The authentication token to store
 */
export function storeAuthToken(token: string | AuthToken): void {
  let tokenData: AuthToken;
  
  if (typeof token === 'string') {
    tokenData = { access_token: token };
  } else {
    tokenData = token;
  }
  
  // Store in localStorage
  localStorage.setItem("auth_token", JSON.stringify(tokenData));
  
  // Store in cookies
  setCookie(COOKIE_NAME, JSON.stringify(tokenData), COOKIE_EXPIRY_DAYS);
}

/**
 * Gets the authentication token from local storage or cookies
 * @returns The authentication token if it exists
 */
export function getAuthToken(): AuthToken | null {
  // Try localStorage first
  const authTokenStr = localStorage?.getItem("auth_token");
  if (authTokenStr) {
    try {
      return JSON.parse(authTokenStr) as AuthToken;
    } catch (e) {
      console.error("Error parsing auth token from localStorage:", e);
    }
  }
  
  // Fall back to cookies
  const cookieTokenStr = getCookie(COOKIE_NAME);
  if (cookieTokenStr) {
    try {
      const tokenData = JSON.parse(cookieTokenStr) as AuthToken;
      // Sync back to localStorage
      localStorage.setItem("auth_token", cookieTokenStr);
      return tokenData;
    } catch (e) {
      console.error("Error parsing auth token from cookie:", e);
    }
  }
  
  return null;
}

/**
 * Gets the access token string from local storage
 * @returns The access token string if it exists
 */
export function getAccessToken(): string | null {
  const authToken = getAuthToken();
  return authToken?.access_token || null;
}

/**
 * Removes the authentication token from both local storage and cookies
 */
export function removeAuthToken(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  deleteCookie(COOKIE_NAME);
}

/**
 * Checks if authentication is required based on environment variables
 * @returns True if authentication is required
 */
export function isAuthRequired(): boolean {
  return PLATFORM_MODE || false;
}

/**
 * Refreshes the authentication token using the refresh token
 * @param refreshToken - The refresh token to use
 * @returns The new authentication token if successful
 */
export async function refreshAuthToken(refreshToken: string): Promise<AuthToken | null> {
  try {
    const response = await fetch(`${getServerURL()}/public/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const newToken = await response.json();
    
    // Store the new token
    storeAuthToken(newToken);
    
    return newToken;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

/**
 * Checks if the current token is expired
 * @returns True if the token is expired or close to expiring
 */
export function isTokenExpired(): boolean {
  const authToken = getAuthToken();
  
  if (!authToken || !authToken.expires_at) {
    return false; // If no expiry info, assume it's valid
  }

  try {
    const expiryTime = new Date(Number(authToken.expires_at)).getTime();
    const currentTime = Date.now();
    
    // Consider token expired if it expires within the next 5 minutes (300000ms)
    const bufferTime = 5 * 60;
    const currentTimeSec = Math.floor(currentTime / 1000);
    return (expiryTime - currentTimeSec) <= bufferTime;
  } catch (error) {
    console.error("Error checking token expiry:", error);
    return false;
  }
}

/**
 * Automatically refreshes the token if it's expired
 * @returns True if token is valid (either not expired or successfully refreshed)
 */
export async function ensureValidToken(): Promise<boolean> {
  const authToken = getAuthToken();
  
  if (!authToken) {
    return false;
  }

  // If token is not expired, it's valid
  if (!isTokenExpired()) {
    return true;
  }

  // Try to refresh the token
  if (authToken.refresh_token) {
    const newToken = await refreshAuthToken(authToken.refresh_token);
    return newToken !== null;
  }

  // No refresh token available, token is invalid
  return false;
}

/**
 * Logs out the user by clearing authentication data and redirecting to login
 */
export function logout(): void {
  // Clear authentication data from localStorage
  removeAuthToken();
  
  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
