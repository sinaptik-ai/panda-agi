"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import { createPaymentSession, getUserSubscription, cancelSubscription, updateSubscription } from "@/lib/api/stripe";
import { toast } from "react-hot-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
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
}

function UpgradeModalContent({ isOpen, onClose }: UpgradeModalProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState<UserSubscriptionResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const checkAuth = async () => {
        if (isAuthRequired()) {
          const token = getAccessToken();
          setIsAuthenticated(!!token);
          if (token) {
            await fetchUserSubscription();
          }
        } else {
          setIsAuthenticated(true);
        }
      };
      checkAuth();
      // Reset toast flag when modal opens
      setHasShownToast(false);
    }
  }, [isOpen]);

  // Handle URL parameters for success/cancel messages
  useEffect(() => {
    const status = searchParams.get('status');
    if (status && !hasShownToast) {
      if (status === 'success') {
        toast.success('Payment successful! Your subscription has been updated.');
        // Refresh subscription data
        if (isAuthenticated) {
          fetchUserSubscription();
        }
      } else if (status === 'cancel') {
        toast.error('Payment was cancelled.');
      }
      setHasShownToast(true);
    }
  }, [searchParams, isAuthenticated, hasShownToast]);

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
      id: 'standard',
      name: 'Standard',
      description: 'For individuals and small teams getting started.',
      price: '€19.99/mo',
      features: [
        '2,000 credits per month',
        'Access to all standard models',
        'Email support',
      ],
      cta: 'Upgrade to Standard'
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'For professionals who need more power and support.',
      price: '€99.99/mo',
      features: [
        '12,000 credits per month',
        'Access to premium models',
        'Priority email support',
        'Early access to new features',
      ],
      popular: true,
      cta: 'Upgrade to Premium'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For organizations requiring advanced features and support.',
      price: 'Custom',
      features: [
        'Unlimited credits',
        'Private cloud or on-premise deployment',
        'Dedicated support & account manager',
        'Custom SLAs and security reviews',
      ],
      cta: 'Contact Sales'
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    if (planId === 'enterprise') {
      window.open('mailto:sales@example.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      const chatUrlWithModal = `${window.location.origin}/chat?upgrade=open`;
      const successUrl = `${chatUrlWithModal}&status=success`;
      const cancelUrl = `${chatUrlWithModal}&status=cancel`;
      
      if (userSubscription?.has_subscription && userSubscription?.subscription) {
        response = await updateSubscription({
          package_name: planId,
          success_url: successUrl
        });
        toast.success("Subscription updated successfully!");
        fetchUserSubscription();
      } else {
        response = await createPaymentSession({
          package_name: planId,
          success_url: successUrl,
          cancel_url: cancelUrl
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
      const success = await cancelSubscription("user_123");
      if (success) {
        await fetchUserSubscription();
        toast.success("Subscription canceled successfully");
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            // Clear URL parameters when closing
            const url = new URL(window.location.href);
            url.searchParams.delete('upgrade');
            url.searchParams.delete('status');
            window.history.replaceState({}, '', url.toString());
            onClose();
          }}
          className="fixed top-6 right-8 z-10 p-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="p-8">
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
                  <Button onClick={() => window.location.href = "/login"} className="w-full">
                    Go to Login
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Choose Your Plan
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Unlock the full potential of PandaAGI with our flexible subscription plans
                </p>
              </div>

              {/* Plans Grid */}
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative ${
                      plan.popular && userSubscription?.subscription?.current_package !== plan.id
                        ? "ring-2 ring-blue-500 shadow-lg scale-105"
                        : userSubscription?.subscription?.current_package === plan.id
                        ? "ring-2 ring-green-500 shadow-lg scale-105"
                        : "hover:shadow-lg transition-shadow"
                    }`}
                  >
                    {plan.popular && userSubscription?.subscription?.current_package !== plan.id && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="inline-flex items-center rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    {userSubscription?.subscription?.current_package === plan.id && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          userSubscription.subscription.status === "active" 
                            ? "bg-green-600 text-white" 
                            : "bg-gray-600 text-white"
                        }`}>
                          {userSubscription.subscription.status === "active" ? "Current Plan" : "Inactive"}
                        </span>
                      </div>
                    )}
                    
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">
                          {plan.price}
                        </span>
                      </div>
                      {userSubscription?.subscription?.current_package === plan.id && userSubscription.subscription.status === "active" && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Next billing: {new Date(userSubscription.subscription.current_period_end * 1000).toLocaleDateString()}</p>
                          {userSubscription.subscription.cancel_at_period_end && (
                            <p className="text-orange-600">Will cancel at period end</p>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {userSubscription?.subscription?.current_package === plan.id && userSubscription?.subscription?.status === "active" ? (
                        <div className="space-y-2">
                          <Button
                            disabled
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Current Plan
                          </Button>
                          {!userSubscription.subscription.cancel_at_period_end && (
                            <Button
                              onClick={handleCancelSubscription}
                              disabled={loading}
                              variant="outline"
                              className="w-full"
                            >
                              {loading ? "Processing..." : "Cancel Subscription"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loading || (userSubscription?.subscription?.current_package === "premium" && plan.id === "standard")}
                          className={`w-full ${
                            plan.popular
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-gray-900 hover:bg-gray-800"
                          }`}
                        >
                          {loading ? "Processing..." : plan.cta}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* FAQ Section */}
              <div className="mt-16 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">What are credits?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Credits are used for AI model interactions. Each conversation or task consumes credits based on the model used and complexity.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Can I upgrade or downgrade my plan?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades apply at the next billing cycle.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        We accept all major credit cards. Enterprise customers can pay via invoice with custom payment terms.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">How do I contact sales for Enterprise?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Click &quot;Contact Sales&quot; on the Enterprise plan to reach our sales team. We&apos;ll work with you to create a custom solution.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpgradeModal(props: UpgradeModalProps) {
  return (
    <Suspense fallback={null}>
      <UpgradeModalContent {...props} />
    </Suspense>
  );
}