"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getServerURL } from "@/lib/server";
import { storeAuthToken, removeAuthToken } from "@/lib/api/auth";

export default function Authenticate() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("Authenticating...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthentication = async () => {
      try {
        setStatus("Processing authentication...");
        
        // Get the hash fragment from the URL (removing the # character)
        const hash = window.location.hash.substring(1);
        
        if (!hash) {
          setError("Unable to authenticate, try again!");
          setStatus("Authentication failed");
          return;
        }

        // Parse the hash fragment into key-value pairs
        const params = hash.split("&").reduce<Record<string, string>>((result, item) => {
          const [key, value] = item.split("=");
          result[key] = decodeURIComponent(value);
          return result;
        }, {});

        // Check if we have an access token
        if (params.access_token) {
          // Create an auth object with all parameters
          const authData = {
            access_token: params.access_token,
            expires_at: params.expires_at || null,
            expires_in: params.expires_in || null,
            refresh_token: params.refresh_token || null,
            token_type: params.token_type || null,
            provider_token: params.provider_token || null
          };
          
          // Clear the hash from URL to avoid potential issues
          window.history.replaceState({}, document.title, "/authenticate");
          
          setStatus("Validating token with server...");
          
          // Validate the token with our backend and set server-side cookies
          try {
            const response = await fetch(`${getServerURL()}/public/auth/validate`, {
              headers: {
                Authorization: `Bearer ${params.access_token}`,
              },
              credentials: 'include', // Include cookies in the request
            });

            if (response.ok) {
              const userData = await response.json();
              console.log("Token validation successful:", userData);

              // Store token in localStorage (server will handle cookies)
              storeAuthToken(authData);

              // Store any user data if needed
              if (userData.user) {
                localStorage.setItem("user_data", JSON.stringify(userData.user));
              }
              
              setStatus("Authentication successful! Redirecting...");
              
              // Redirect to the chat page
              setTimeout(() => {
                router.push("/chat");
              }, 1000);
            } else {
              console.error("Token validation failed");
              setError("Token validation failed. Please try again.");
              setStatus("Authentication failed");
              removeAuthToken();
            }
          } catch (validationError) {
            console.error("Token validation error:", validationError);
            setError(`Error validating token: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
            setStatus("Authentication failed");
            removeAuthToken();
          }
        } else {
          setError("No access token found in the URL");
          setStatus("Authentication failed");
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        setError(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setStatus("Authentication failed");
      }
    };

    handleAuthentication();
  }, [router]); // Only run this effect once when component mounts

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 relative">
              <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
                🐼
              </span>
            </div>
            
            <h1 className="text-2xl font-bold text-center">
              {status}
            </h1>
            
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
                {error}
              </div>
            )}
            
            {status === "Authentication failed" && (
              <button 
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Return to Login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
