"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown, ArrowLeft } from "lucide-react";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import { createPaymentSession, getUserSubscription, cancelSubscription, createCustomerPortal, updateSubscription } from "@/lib/api/stripe";
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

export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");
  const [loading, setLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState<UserSubscriptionResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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
  }, []);

  const fetchUserSubscription = async () => {
    try {
      // For now, using a placeholder user ID - in real implementation, get from auth
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

    // For Enterprise plan, redirect to contact sales
    if (planId === 'enterprise') {
      window.open('mailto:sales@example.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      // If user has an existing subscription, use update-subscription
      if (userSubscription?.has_subscription && userSubscription?.subscription) {
        response = await updateSubscription({
          user_id: "user_123", // In real implementation, get from auth
          package_name: planId,
          success_url: `${window.location.origin}/upgrade`
        });
      } else {
        // For new subscriptions, use create-payment-session
        response = await createPaymentSession({
          package_name: planId,
          success_url: `${window.location.origin}/upgrade`,
          cancel_url: `${window.location.origin}/upgrade`
        });
      }
      
      window.location.href = response.checkout_url;
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
      const success = await cancelSubscription("user_123"); // In real implementation, get from auth
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

  if (!isAuthenticated && isAuthRequired()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/chat')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </Button>
        </div>
        
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
                  We accept all major credit cards.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How do I contact sales for Enterprise?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Click "Contact Sales" on the Enterprise plan to reach our sales team. We'll work with you to create a custom solution.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 