"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  getGitHubAuthUrl, 
  getAccessToken, 
  isAuthRequired 
} from "@/lib/api/auth";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Check if auth is required
    if (!isAuthRequired()) {
      router.push("/chat");
      return;
    }

    // Handle GitHub OAuth callback if code is present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Redirect to authenticate page with the code
      router.push(`/authenticate?code=${code}`);
      return;
    }

    // Check if user is already authenticated
    const token = getAccessToken();
    if (token) {
      router.push("/chat");
    }
  }, [router]);

  const handleGitHubLogin = async () => {
    const authUrl = await getGitHubAuthUrl();
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 mb-4 relative">
              <span className="text-5xl select-none absolute inset-0 flex items-center justify-center">
                🐼
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome to Panda AGI
            </h1>
          </div>

          <p className="text-gray-600 mb-6 text-center">
            Please log in to continue to the application
          </p>

          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.22.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.4-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.63.7 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.67.91.67 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z"
                clipRule="evenodd"
              />
            </svg>
            Login with GitHub
          </button>
        </div>
      </div>
    </>
  );
}
