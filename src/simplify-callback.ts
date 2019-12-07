/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  createDataStream,
  createSubscription,
  DataStream,
  Subscription
} from "./subscription";
import { CallbackResult, isType, Omit } from "./utils";

type Params = Readonly<{
  /** The name of the function to be wrapped. */
  funcNameToWrap: string;

  /** The method being wrapped. */
  funcToWrap: (callbackName: string) => unknown;

  /** Function to create the name of the callback that will receive results. */
  callbackNameFunc: () => string;
}>;

/**
 * Represents stream events that be used to communicate state of the stream
 * from native to web.
 */
export enum StreamEvent {
  STREAM_TERMINATED = "STREAM_TERMINATED"
}

/**
 * Represents an event result, which is a possible object that can be returned
 * in place of the callback result.
 */
export type StreamEventResult = Readonly<{
  event: StreamEvent;
}>;

/**
 * Convert the callback to a stream to receive continual values.
 * @template T The emission value type.
 * @param global The global object - generally window.
 * @param param1 Parameters for stream creation.
 * @return A stream that can be subscribed to.
 */
function streamCallback<T>(
  global: any,
  { callbackNameFunc, funcToWrap }: Omit<Params, "funcNameToWrap">
): DataStream<T> {
  return createDataStream(
    (handlers): Subscription => {
      /** Generate callback name dynamically to make this stream idempotent. */
      const callbackName = callbackNameFunc();
      let subscription: Subscription;

      global[callbackName] = (data: CallbackResult<T>) => {
        if (isType<StreamEventResult>(data.result, "event")) {
          switch (data.result.event) {
            case StreamEvent.STREAM_TERMINATED:
              subscription.unsubscribe();
              break;
          }
        } else {
          const { result, error, status_code } = data;

          !!handlers &&
            !!handlers.next &&
            handlers.next({
              result: result === null ? undefined : result,
              error: error === null ? undefined : error,
              status_code: status_code === null ? undefined : status_code
            });
        }
      };

      /**
       * Beware that this function may throw a non-recoverable error, such
       * as module not available. In that case, we should let this call fail
       * and ensure the error is caught downstream.
       */
      funcToWrap(callbackName);

      subscription = createSubscription(() => {
        /**
         * Native should check for the existence of this callback every time a
         * value is bound to be delivered. If no such callback exists, it may
         * be assumed that the web client has unsubscribed from this stream, and
         * therefore the stream may be terminated on the mobile side.
         */
        global[callbackName] = undefined;
        !!handlers && !!handlers.complete && handlers.complete();
      });

      return subscription;
    }
  );
}

/**
 * Handle the simplication of callbacks for both single asynchronous return
 * values and streams.
 * @param global The global object - generally window.
 * @param param1 Parameters for callback simplification.
 * @return Check the return types for private functions in this module.
 */
export function simplifyCallback(
  global: any,
  { funcNameToWrap, ...restParams }: Params
) {
  return streamCallback(global, restParams);
}
