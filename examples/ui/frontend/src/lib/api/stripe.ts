import { API_URL } from '../config'
import { getApiOptions } from './common'

interface PortalRequest {
  return_url?: string
  check_availability?: boolean
}

interface CreatePaymentSessionRequest {
  package_name: string
  success_url?: string
  cancel_url?: string
}

interface UpdateSubscriptionRequest {
  package_name: string
  success_url?: string
}

interface CreatePaymentSessionResponse {
  checkout_url: string
  session_id: string
}

interface SubscriptionInfo {
  subscription_id: string
  status: string
  current_package: string
  current_period_end: number
  cancel_at_period_end: boolean
}

export interface UserSubscriptionResponse {
  has_subscription: boolean
  subscription?: SubscriptionInfo
}

export interface UserCreditsResponse {
  id: string;
  user_id: string;
  total_credits: number;
  credits_left: number;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a Stripe payment session for subscription
 */
export async function createPaymentSession(
  params: CreatePaymentSessionRequest
): Promise<CreatePaymentSessionResponse> {
  const options = await getApiOptions();
  const response = await fetch(`${API_URL}/payment/stripe/create-payment-session`, {
    method: 'POST',
    ...options,
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create payment session')
  }

  return response.json()
}

/**
 * Updates an existing subscription to a new package
 */
export async function updateSubscription(
  params: UpdateSubscriptionRequest
): Promise<CreatePaymentSessionResponse> {
  const options = await getApiOptions();
  const response = await fetch(`${API_URL}/payment/stripe/update-subscription`, {
    method: 'POST',
    ...options,
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to update subscription')
  }

  return response.json()
}

/**
 * Gets a user's current subscription information
 */
export async function getUserSubscription(): Promise<UserSubscriptionResponse> {
  const options = await getApiOptions(false);
  const response = await fetch(`${API_URL}/payment/stripe/subscription`, {
    method: 'GET',
    ...options,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get subscription information')
  }

  return response.json()
}

/**
 * Cancels a user's subscription
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  const options = await getApiOptions();
  const response = await fetch(`${API_URL}/payment/stripe/cancel-subscription`, {
    method: 'POST',
    ...options,
    body: JSON.stringify({ user_id: userId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to cancel subscription')
  }

  return true
}

/**
 * Creates a Stripe customer portal session for managing billing
 */
export async function createCustomerPortal(
  params?: PortalRequest
): Promise<{ url: string }> {
  const options = await getApiOptions();
  const response = await fetch(`${API_URL}/payment/stripe/create-customer-portal`, {
    method: 'POST',
    ...options,
    body: JSON.stringify(params || {}),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create customer portal session')
  }

  return response.json()
}

export const getUserCredits = async (): Promise<UserCreditsResponse> => {
  const options = await getApiOptions();
  
  const response = await fetch(`${API_URL}/payment/stripe/user/credits`, {
    method: "GET",
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user credits: ${response.statusText}`);
  }

  return response.json();
};
