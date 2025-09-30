import { getServerURL } from "@/lib/server";
import { PLATFORM_MODE } from "@/lib/config";
import { identifyUser, resetUser } from "./posthog";

/**
 * Cookie utility functions
 */
const COOKIE_NAME = "auth_token";
const COOKIE_EXPIRY_DAYS = 30;

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  // For development, we need to set cookies that work across localhost ports
  // In production, you would set the domain to your actual domain
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const domain = isLocalhost ? "" : `;domain=.pandas-ai.com`;

  const encodedValue = encodeURIComponent(value);

  document.cookie = `${name}=${encodedValue};expires=${expires.toUTCString()};path=/;SameSite=Lax${domain}`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const encodedValue = c.substring(nameEQ.length, c.length);
      // Decode the URI-encoded cookie value
      return decodeURIComponent(encodedValue);
    }
  }
  return null;
}

function deleteCookie(name: string): void {
  // For development, we need to delete cookies that work across localhost ports
  // In production, you would set the domain to your actual domain
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const domain = isLocalhost ? "" : `;domain=.pandas-ai.com`;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;${domain}`;
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
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    return response.ok;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

/**
 * Gets the authentication URL from the backend for a specific provider
 * @param provider - The authentication provider (e.g., 'github', 'google', etc.)
 * @returns The authentication URL if successful
 */
export async function getAuthUrl(provider: string): Promise<string | null> {
  try {
    // Get the current host and construct the redirect URI
    const currentHost = window.location.origin;
    const redirectUri = `${currentHost}/`;

    // Pass the redirect URI as a query parameter
    const response = await fetch(
      `${getServerURL()}/public/auth/provider/${provider.toLowerCase()}?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();

    if (data && data.auth_url) {
      return data.auth_url;
    } else {
      console.error(
        `${provider} authentication URL not found in response:`,
        data
      );
      throw new Error(
        `${provider} authentication URL not found in response, try again later`
      );
    }
  } catch (error) {
    console.error(`Failed to fetch ${provider} authentication URL:`, error);
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        throw new Error(
          "Server is not responding. Please try again in a few minutes."
        );
      }
      throw new Error(error.message);
    }
    throw new Error(
      `Failed to fetch ${provider} authentication URL, try again later`
    );
  }
}

/**
 * Gets the GitHub authentication URL from the backend
 * @returns The GitHub authentication URL if successful
 * @deprecated Use getAuthUrl('github') instead
 */
export async function getGitHubAuthUrl(): Promise<string | null> {
  return getAuthUrl("github");
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
  user?: User;
}

/**
 * User interface based on the stored user data structure
 */
export interface User {
  id: string;
  email: string;
}

/**
 * Stores the authentication token in both local storage and cookies
 * @param token - The authentication token to store
 */
export function storeAuthToken(token: string | AuthToken): void {
  let tokenData: AuthToken;

  if (typeof token === "string") {
    tokenData = { access_token: token };
  } else {
    tokenData = token;
  }

  // Only access localStorage in browser environment
  if (typeof window !== "undefined") {
    // Store in localStorage
    localStorage.setItem("auth_token", JSON.stringify(tokenData));

    // Notify auth state change
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authChange"));
    }
  }

  // Store in cookies
  // Remove user key from token data if it exists
  const { user, ...tokenDataWithoutUser } = tokenData;
  setCookie(COOKIE_NAME, JSON.stringify(tokenDataWithoutUser), COOKIE_EXPIRY_DAYS);

  // Identify the user
  if (tokenData?.user) {
    identifyUser(tokenData.user);
  }
}

/**
 * Gets the authentication token from local storage or cookies
 * @returns The authentication token if it exists
 */
export function getAuthToken(): AuthToken | null {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return null;
  }

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
  const token = authToken?.access_token || null;
  return token;
}

/**
 * Gets the user data from the stored authentication token
 * @returns The user object if it exists, null otherwise
 */
export function getUser(): User | null {
  const authToken = getAuthToken();
  return {
    id: authToken?.user?.id || "",
    email: authToken?.user?.email || "",
  };
}

/**
 * Removes the authentication token from both local storage and cookies
 */
export function removeAuthToken(): void {
  // Delete cookie FIRST to prevent it from being synced back
  deleteCookie(COOKIE_NAME);

  // Only access localStorage in browser environment
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");

    // Notify auth state change AFTER both are cleared
    window.dispatchEvent(new Event("authChange"));
  }
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
export async function refreshAuthToken(
  refreshToken: string
): Promise<AuthToken | null> {
  try {
    const response = await fetch(
      `${getServerURL()}/public/auth/refresh-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: "include",
      }
    );

    if (!response.ok) {
      // Check if it's a server downtime or timeout error
      if (response.status === 503 || response.status === 504) {
        console.warn(
          "Authentication service temporarily unavailable, keeping existing token"
        );
        // Return the current token instead of null to prevent logout
        return getAuthToken();
      }

      // For other errors (401, 403, etc.), the token is actually invalid
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const newToken = await response.json();

    // Store the new token
    storeAuthToken(newToken);

    return newToken;
  } catch (error) {
    // Check if it's a network error (server down, timeout, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn(
        "Network error during token refresh, keeping existing token"
      );
      // Return the current token instead of null to prevent logout
      return getAuthToken();
    }

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
    return expiryTime - currentTimeSec <= bufferTime;
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

    // If we get a token back (even the old one due to server downtime), consider it valid
    if (newToken !== null) {
      return true;
    }

    // Only return false if we explicitly got null (token is actually invalid)
    return false;
  }

  // No refresh token available, token is invalid
  return false;
}

/**
 * Logs out the user by clearing authentication data
 */
export function logout(): void {
  // Clear authentication data from localStorage
  removeAuthToken();

  // Reset the user
  resetUser();

  // Explicitly dispatch auth change event to ensure all components update
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("authChange"));

    // Small delay to ensure event is processed
    setTimeout(() => {
      window.dispatchEvent(new Event("authChange"));
    }, 10);
  }
}
