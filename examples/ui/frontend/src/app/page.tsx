"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";

// Client Component with authentication routing
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if authentication is required
    if (!isAuthRequired()) {
      // If auth is not required, go directly to chat
      router.push("/chat");
      return;
    }

    // Check if user is already authenticated
    const token = getAccessToken();
    
    if (token) {
      // User is authenticated, redirect to chat
      router.push("/chat");
    } else {
      // User is not authenticated, redirect to login
      router.push("/login");
    }
  }, [router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 relative mb-4 mx-auto">
          <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
            🐼
          </span>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
        <p className="text-muted-foreground">Checking authentication status</p>
      </div>
    </div>
  );
}
