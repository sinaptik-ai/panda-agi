import { getServerURL } from "../server";

/**
 * Validates the authentication token
 * @param token - The token to validate
 * @returns True if the token is valid
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${getServerURL()}/auth/validate`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}