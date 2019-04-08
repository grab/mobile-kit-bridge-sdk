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
/**
 * Represents a Stream that can deliver some data continually. It can also be
 * used like a Promise - in which case it simply delivers the first value that
 * arrives and then terminates itself.
 *
 * Note that this stream currently does not support error notifications like
 * an Observable would. All errors will be included in the data payload, so as
 * to simplify workflow for end-users.
 */
export declare type DataStream = Readonly<{
    subscribe: (handlers?: DataStreamHandlers) => Subscription;
}> & PromiseLike<CallbackResult>;
/**
 * Create a subscription that can only be unsubscribed from once.
 * @param unsubscribe Unsubscription logic.
 */
export declare function createSubscription(unsubscribe: () => unknown): Subscription;
/**
 * Create a data stream with default functionalities. When we implement
 * Promise functionalities, beware that if then block is executed immediately
 * (i.e. a resolved promise), the subscription object may not be created yet.
 *
 * The call to subscribe may throw an error which we need to catch, due to the
 * asynchronous nature of Promises. This error will then be passed to the
 * reject call.
 * @param subscribe Injected subscribe function.
 * @return A DataStream instance.
 */
export declare function createDataStream(subscribe: DataStream['subscribe']): DataStream;
