import { CallbackResult } from './utils';
/** Represents an object that can be unsubscribed from to termindate a stream. */
export declare type Subscription = Readonly<{
    isUnsubscribed: () => boolean;
    unsubscribe: () => unknown;
}>;
/** Represents functions that can handle stream events. */
export declare type StreamHandlers = Readonly<{
    onValue: (data: CallbackResult) => unknown;
    onComplete?: () => unknown;
}>;
/** Represents a Stream that can deliver some data continually */
export declare type Stream = Readonly<{
    subscribe: (handlers: StreamHandlers) => Subscription;
}>;
/**
 * Create a subscription that can only be unsubscribed from once.
 * @param unsubscribe Unsubscription logic.
 */
export declare function createSubscription(unsubscribe: () => unknown): Subscription;
