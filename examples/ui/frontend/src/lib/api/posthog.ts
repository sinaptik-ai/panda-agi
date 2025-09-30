import posthog from "posthog-js";
import { User } from "./auth";

export function initializePostHog() {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      loaded: (ph) => {
        ph.register({ app_loaded_date: new Date().toISOString() });
      }
    });
  }
}

export function identifyUser(user: User) {
  posthog.identify(user.id, {
    email: user.email,
  });
}


export function resetUser() {
  posthog.reset();
}