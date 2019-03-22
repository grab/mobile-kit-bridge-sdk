import { CallbackResult } from "./common";

/** Represents an object that can be unsubscribed from to termindate a stream. */
export type Subscription = Readonly<{ unsubscribe: () => unknown }>;

/** Represents a Stream that can deliver some data continually */
export type Stream = Readonly<{
  subscribe: (onValue: (data: CallbackResult) => unknown) => Subscription;
}>;

/**
 * Create a subscription that can only be unsubscribed from once.
 * @param unsubscribe Unsubscription logic.
 */
export function createSubscription(unsubscribe: () => unknown): Subscription {
  let unsubscribed = false;

  return {
    unsubscribe: () => {
      if (!unsubscribed) {
        unsubscribe();
        unsubscribed = true;
      }
    }
  };
}
