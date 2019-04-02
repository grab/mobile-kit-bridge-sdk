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

/**
 * Represents a Stream that can deliver some data continually. It can also be
 * used like a Promise - in which case it simply delivers the first value that
 * arrives and then terminates itself.
 *
 * Note that this stream currently does not support error notifications like
 * an Observable would. All errors will be included in the data payload, so as
 * to simplify workflow for end-users.
 */
export type DataStream = Readonly<{
  subscribe: (handlers?: DataStreamHandlers) => Subscription;
}> &
  PromiseLike<CallbackResult>;

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

/**
 * Create a data stream with default functionalities.
 * @param subscribe Injected subscribe function.
 * @return A DataStream instance.
 */
export function createDataStream(
  subscribe: DataStream['subscribe']
): DataStream {
  return {
    subscribe,
    then: onFulfilled => {
      return new Promise(() => {
        const subscription = subscribe({
          next: data => {
            !!onFulfilled && onFulfilled(data);
            subscription.unsubscribe();
          }
        });
      });
    }
  };
}
