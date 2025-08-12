"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function UpgradeCancelPage() {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.href = "/upgrade";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <XCircle className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl text-orange-800">
            Upgrade Cancelled
          </CardTitle>
          <CardDescription className="text-orange-600">
            Your subscription upgrade was cancelled. You can try again anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">No worries!</h3>
            <p className="text-sm text-orange-700">
              You can still use PandaAGI with the free plan. Upgrade anytime to unlock premium features.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.href = "/upgrade"}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/chat"}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            Redirecting to upgrade page in {countdown} seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 