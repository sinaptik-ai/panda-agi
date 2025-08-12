"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function UpgradeSuccessPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.href = "/chat";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-800">
            Upgrade Successful!
          </CardTitle>
          <CardDescription className="text-green-600">
            Thank you for upgrading your PandaAGI subscription. You now have access to all premium features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Access to unlimited conversations</li>
              <li>• Advanced AI models</li>
              <li>• Priority support</li>
              <li>• Custom integrations</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.href = "/chat"}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Start Chatting
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/upgrade"}
              className="flex-1"
            >
              Manage Subscription
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            Redirecting to chat in {countdown} seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 