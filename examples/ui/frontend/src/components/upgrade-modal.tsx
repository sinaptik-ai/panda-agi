"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import {
  createPaymentSession,
  getUserSubscription,
  cancelSubscription,
  updateSubscription,
} from "@/lib/api/stripe";
import { toast } from "react-hot-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  features: { text: string; included: boolean }[];
  popular?: boolean;
  cta: string;
}

interface SubscriptionInfo {
  subscription_id: string;
  status: string;
  current_package: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface UserSubscriptionResponse {
  has_subscription: boolean;
  subscription?: SubscriptionInfo;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowLogin?: () => void;
  standalone?: boolean;
}

function UpgradeModal({
  isOpen,
  onClose,
  onShowLogin,
  standalone = false,
}: UpgradeModalProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [userSubscription, setUserSubscription] =
    useState<UserSubscriptionResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const lastProcessedStatus = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Handle URL replacement for modal mode
      if (!standalone && typeof window !== "undefined") {
        console.log("setting original url", window.location.href);
        setOriginalUrl(window.location.href);
        const newUrl = new URL("/upgrade", window.location.origin);
        // Preserve any existing status parameter
        const status = new URLSearchParams(window.location.search).get(
          "status"
        );
        if (status) {
          newUrl.searchParams.set("status", status);
        }
        window.history.pushState({}, "", newUrl.toString());
      }

      const checkAuth = async () => {
        if (isAuthRequired()) {
          const token = getAccessToken();
          setIsAuthenticated(!!token);
          if (token) {
            await fetchUserSubscription();
          }
        } else {
          setIsAuthenticated(true);
          // Even without auth, try to fetch subscription data
          await fetchUserSubscription();
        }
      };
      checkAuth();
      // Reset status processing flag when modal opens
      lastProcessedStatus.current = null;
    }
  }, [isOpen, standalone]);

  // Handle URL parameters for success/cancel messages
  useEffect(() => {
    if (typeof window === "undefined") return;
  
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
  
    if (status && lastProcessedStatus.current !== status) {
      lastProcessedStatus.current = status;
  
      if (status === "success") {
        toast.success("Payment successful! Your subscription has been updated.");
        if (isAuthenticated) fetchUserSubscription();
      } else if (status === "cancel") {
        toast.error("Payment was cancelled.");
      }
  
      // Clear status
      url.searchParams.delete("status");
      window.history.replaceState({}, "", url.toString());
    }
  }, [isAuthenticated]);

  // Cleanup effect to restore URL when component unmounts
  useEffect(() => {
    return () => {
      if (!standalone && originalUrl && typeof window !== "undefined") {
        window.history.pushState({}, "", originalUrl);
      }
    };
  }, [standalone, originalUrl]);

  const fetchUserSubscription = async () => {
    try {
      const subscription = await getUserSubscription();
      setUserSubscription(subscription);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  const plans: Plan[] = [
    {
      id: "free",
      name: "Free Plan",
      description: "Perfect for getting started with basic features.",
      price: "€0",
      features: [
        { text: "500 credits on signup (~50 dashboards)", included: true },
        { text: "Data Analysis (Python)", included: true },
        { text: "Create Dashboards", included: true },
        { text: "Create Charts/Graphs", included: true },
        { text: "Remove Branding", included: false },
        { text: "Premium Support", included: false },
      ],
      cta: "Get Started",
    },
    {
      id: "plus",
      name: "Plus Plan",
      description: "For individuals and small teams getting started.",
      price: "€19.99/mo",
      features: [
        { text: "1,000 credits per month (~100 dashboards)", included: true },
        { text: "Data Analysis (Python)", included: true },
        { text: "Create Dashboards", included: true },
        { text: "Create Charts/Graphs", included: true },
        { text: "Remove Branding", included: false },
        { text: "Premium Support", included: false },
      ],
      cta: "Upgrade to Plus",
    },
    {
      id: "pro",
      name: "Pro Plan",
      description: "For professionals who need more power and support.",
      price: "€99.99/mo",
      features: [
        { text: "2,500 credits per month (~250 dashboards)", included: true },
        { text: "Data Analysis (Python)", included: true },
        { text: "Create Dashboards", included: true },
        { text: "Create Charts/Graphs", included: true },
        { text: "Remove Branding", included: true },
        { text: "Premium Support", included: true },
      ],
      popular: true,
      cta: "Upgrade to Pro",
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated) {
      if (onShowLogin) {
        onShowLogin();
      } else {
        // Fallback to home page where login modal will be shown
        window.location.href = "/";
      }
      return;
    }

    if (planId === "free") {
      // Free plan doesn't require payment
      toast.success("You're already on the free plan!");
      return;
    }

    setLoading(true);
    try {
      let response;

      const successUrl = `${window.location.origin}/upgrade?status=success`;
      const cancelUrl = `${window.location.origin}/upgrade?status=cancel`;

      if (
        userSubscription?.has_subscription &&
        userSubscription?.subscription
      ) {
        response = await updateSubscription({
          package_name: planId,
          success_url: successUrl,
        });
        toast.success("Subscription updated successfully!");
        await fetchUserSubscription();
      } else {
        response = await createPaymentSession({
          package_name: planId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to process upgrade. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userSubscription) return;

    setLoading(true);
    try {
      const isCurrentlyCancelled = userSubscription.subscription?.cancel_at_period_end;
      const success = await cancelSubscription("user_123");
      
      if (success) {
        await fetchUserSubscription();
        if (isCurrentlyCancelled) {
          toast.success("Subscription reactivated successfully");
        } else {
          toast.success("Subscription canceled successfully");
        }
      } else {
        throw new Error(`Failed to ${isCurrentlyCancelled ? 'reactivate' : 'cancel'} subscription`);
      }
    } catch (error) {
      console.error("Subscription action error:", error);
      const isCurrentlyCancelled = userSubscription.subscription?.cancel_at_period_end;
      toast.error(`Failed to ${isCurrentlyCancelled ? 'reactivate' : 'cancel'} subscription. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <>
      {!isAuthenticated && isAuthRequired() ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please log in to view and manage your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  if (onShowLogin) {
                    onShowLogin();
                  } else {
                    // Fallback to home page where login modal will be shown
                    window.location.href = "/";
                  }
                }}
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold tracking-tight mb-2">
              Choose your plan
            </h2>
            <p className="text-muted-foreground">
              Unlock the full potential of PandaAGI with our flexible
              subscription plans
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.popular &&
                  userSubscription?.subscription?.current_package !== plan.id
                    ? "ring-2 ring-primary shadow-md"
                    : userSubscription?.subscription?.current_package ===
                      plan.id
                    ? "ring-2 ring-green-500 shadow-md"
                    : plan.id === "free" && !userSubscription?.has_subscription
                    ? "ring-2 ring-blue-500 shadow-md"
                    : "hover:shadow-md"
                }`}
              >
                {plan.popular &&
                  userSubscription?.subscription?.current_package !==
                    plan.id && (
                    <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}

                {userSubscription?.subscription?.current_package ===
                  plan.id && (
                  <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        userSubscription.subscription.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {userSubscription.subscription.status === "active"
                        ? "Current Plan"
                        : "Inactive"}
                    </div>
                  </div>
                )}

                {plan.id === "free" && !userSubscription?.has_subscription && (
                  <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-semibold">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold tracking-tight">
                      {plan.price}
                    </span>
                  </div>
                  {userSubscription?.subscription?.current_package ===
                    plan.id &&
                    userSubscription.subscription.status === "active" && (
                      <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <p>
                          {userSubscription.subscription.cancel_at_period_end
                            ? "Access until:"
                            : "Next billing:"}{" "}
                          {new Date(userSubscription.subscription.current_period_end).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {userSubscription.subscription.cancel_at_period_end && (
                          <p className="text-orange-600 dark:text-orange-400 font-medium">
                            Subscription will end on this date
                          </p>
                        )}
                      </div>
                    )}
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {(userSubscription?.subscription?.current_package ===
                    plan.id &&
                  userSubscription?.subscription?.status === "active") ||
                  (plan.id === "free" && !userSubscription?.has_subscription) ? (
                    <div className="space-y-2">
                      <Button disabled className="w-full" variant="secondary">
                        Current Plan
                      </Button>
                      {userSubscription?.subscription?.current_package === plan.id &&
                        userSubscription?.subscription?.status === "active" &&
                        !userSubscription.subscription.cancel_at_period_end && (
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={loading}
                          variant="outline"
                          className="w-full"
                        >
                          {loading ? "Processing..." : "Cancel Subscription"}
                        </Button>
                      )}
                      {userSubscription?.subscription?.current_package === plan.id &&
                        userSubscription?.subscription?.status === "active" &&
                        userSubscription.subscription.cancel_at_period_end && (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loading}
                          variant="default"
                          className="w-full"
                        >
                          {loading ? "Processing..." : "Reactivate Subscription"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={
                        loading ||
                        (userSubscription?.subscription?.current_package ===
                          "pro" &&
                          plan.id === "plus") ||
                        (userSubscription?.subscription?.current_package ===
                          "pro" &&
                          plan.id === "free") ||
                        (userSubscription?.subscription?.current_package ===
                          "plus" &&
                          plan.id === "free")
                      }
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {loading ? "Processing..." : plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-12 border-t pt-8">
            <h3 className="text-lg font-semibold text-center mb-6">
              Frequently Asked Questions
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">What are credits?</h4>
                <p className="text-sm text-muted-foreground">
                  Credits are used for AI model interactions. Each conversation
                  consumes credits based on the model and complexity.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Can I change my plan?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes, you can change your plan anytime. Upgrades take effect
                  immediately, downgrades at the next billing cycle.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Payment methods</h4>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards. Enterprise customers can pay
                  via invoice.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Enterprise sales</h4>
                <p className="text-sm text-muted-foreground">
                  Click &quot;Contact Sales&quot; on the Enterprise plan to
                  reach our sales team for custom solutions.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (standalone) {
    return <div className="py-12">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-white rounded-lg border shadow-lg overflow-hidden">
        {/* Close Button */}
        <button
          aria-label="Close"
          onClick={() => {
            // Restore original URL when closing modal
            if (!standalone && originalUrl) {
              window.history.pushState({}, "", originalUrl);
            } else {
              // Clear URL parameters when closing
              const url = new URL(window.location.href);
              url.searchParams.delete("status");
              window.history.replaceState({}, "", url.toString());
            }
            onClose();
          }}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="overflow-y-auto max-h-[90vh] p-6">{content}</div>
      </div>
    </div>
  );
}

export default UpgradeModal;
