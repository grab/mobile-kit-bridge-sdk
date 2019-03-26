import { CallbackResult } from './utils';
/** Represents an object that can be unsubscribed from to termindate a stream. */
export declare type Subscription = Readonly<{
    isUnsubscribed: () => boolean;
    unsubscribe: () => unknown;
}>;
/** Represents functions that can handle stream events. */
export declare type DataStreamHandlers = Readonly<{
    next?: (data: CallbackResult) => unknown;
    complete?: () => unknown;
}>;
/** Represents a Stream that can deliver some data continually */
export declare type DataStream = Readonly<{
    subscribe: (handlers?: DataStreamHandlers) => Subscription;
}>;
/**
 * Create a subscription that can only be unsubscribed from once.
 * @param unsubscribe Unsubscription logic.
 */
export declare function createSubscription(unsubscribe: () => unknown): Subscription;
