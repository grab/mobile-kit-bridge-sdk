import { CallbackResult } from './utils';

/** Represents an object that can be unsubscribed from to termindate a stream. */
export type Subscription = Readonly<{
  isUnsubscribed: () => boolean;
  unsubscribe: () => unknown;
}>;

/** Represents functions that can handle stream events. */
export type DataStreamHandlers = Readonly<{
  next?: (data: CallbackResult) => unknown;
  complete?: () => unknown;
}>;

/** Represents a Stream that can deliver some data continually */
export type DataStream = Readonly<{
  subscribe: (handlers?: DataStreamHandlers) => Subscription;
}>;

/**
 * Create a subscription that can only be unsubscribed from once.
 * @param unsubscribe Unsubscription logic.
 */
export function createSubscription(unsubscribe: () => unknown): Subscription {
  let unsubscribed = false;

  return {
    isUnsubscribed: () => unsubscribed,
    unsubscribe: () => {
      if (!unsubscribed) {
        unsubscribe();
        unsubscribed = true;
      }
    }
  };
}
