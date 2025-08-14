import { isAuthRequired, getAccessToken, ensureValidToken, logout } from "./auth";

export const getApiHeaders = async (includeContentType: boolean = true) => {
    const headers: Record<string, string> = {};
    
    if (isAuthRequired()) {
        // Ensure token is valid (refresh if needed)
        const isValidToken = await ensureValidToken();
        
        if (!isValidToken) {
            // Token is invalid and couldn't be refreshed, logout user
            logout();
            throw Error("Authentication expired. Please login again.");
        }
        
        const access_token = getAccessToken();
        if (!access_token) {
            throw Error("Authentication Required!");
        }
        headers["X-Authorization"] = `Bearer ${access_token}`;
    }
    
    // Only add Content-Type if explicitly requested (don't add for file uploads)
    if (includeContentType) {
        headers["Content-Type"] = "application/json";
    }
    
    return headers;
};

export const getApiOptions = async (includeContentType: boolean = true) => {
    const headers = await getApiHeaders(includeContentType);
    
    return {
        headers,
        credentials: 'include' as const, // Include cookies in requests
    };
};