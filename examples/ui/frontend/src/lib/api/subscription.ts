import { getServerURL } from "@/lib/server";
import { getAccessToken } from "./auth";

export interface Subscription {
  id: string;
  plan: string;
  status: "active" | "canceled" | "past_due" | "incomplete";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

/**
 * Gets the current user's subscription
 * @returns The user's subscription data
 */
export async function getUserSubscription(): Promise<Subscription | null> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${getServerURL()}/api/subscription`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // User has no subscription
      }
      throw new Error(`Failed to fetch subscription: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }
}

/**
 * Creates a checkout session for subscription upgrade
 * @param planId - The plan ID to subscribe to
 * @param interval - Billing interval (monthly or yearly)
 * @returns The checkout session URL
 */
export async function createCheckoutSession(
  planId: string,
  interval: "monthly" | "yearly"
): Promise<string> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${getServerURL()}/api/subscription/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        interval: interval,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create checkout session: ${response.status}`);
    }

    const data: CheckoutSession = await response.json();
    return data.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

/**
 * Cancels the current subscription
 * @returns True if cancellation was successful
 */
export async function cancelSubscription(): Promise<boolean> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${getServerURL()}/api/subscription/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel subscription: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return false;
  }
}

/**
 * Reactivates a canceled subscription
 * @returns True if reactivation was successful
 */
export async function reactivateSubscription(): Promise<boolean> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${getServerURL()}/api/subscription/reactivate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to reactivate subscription: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return false;
  }
}

/**
 * Updates the subscription to a different plan
 * @param planId - The new plan ID
 * @param interval - Billing interval (monthly or yearly)
 * @returns True if update was successful
 */
export async function updateSubscription(
  planId: string,
  interval: "monthly" | "yearly"
): Promise<boolean> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${getServerURL()}/api/subscription/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        interval: interval,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update subscription: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error updating subscription:", error);
    return false;
  }
}

/**
 * Gets the available subscription plans
 * @returns Array of available plans
 */
export async function getAvailablePlans(): Promise<any[]> {
  try {
    const response = await fetch(`${getServerURL()}/api/subscription/plans`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
} 