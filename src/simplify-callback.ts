import { createSubscription, DataStream, Subscription } from './subscription';
import { CallbackResult, isStreamFunction, isType, Omit } from './utils';

type Params = Readonly<{
  /** The name of the function to be wrapped. */
  funcNameToWrap: string;

  /** The method being wrapped. */
  funcToWrap: (callbackName: string) => () => unknown;

  /** Function to create the name of the callback that will receive results. */
  callbackNameFunc: () => string;
}>;

/**
 * Represents stream events that be used to communicate state of the stream
 * from native to web.
 */
export enum StreamEvent {
  STREAM_TERMINATED = 'STREAM_TERMINATED'
}

/**
 * Represents an event result, which is a possible object that can be returned
 * in place of the callback result.
 */
export type StreamEventResult = Readonly<{
  event: StreamEvent;
}>;

/**
 * For web bridges, native code will run a JS script that accesses a global
 * callback related to the module's method being wrapped and pass in results so
 * that partner app can access them. This function promisifies this callback to
 * support async-await/Promise.
 * @param globalObject The global object - generally window.
 * @param params Parameters for promisify.
 * @return Promise that resolves to the callback result.
 */
function promisifyCallback(
  globalObject: any,
  { callbackNameFunc, funcToWrap }: Omit<Params, 'funcNameToWrap'>
): PromiseLike<any> {
  const callbackName = callbackNameFunc();

  return new Promise(resolve => {
    globalObject[callbackName] = (data: CallbackResult) => {
      resolve(data);

      /**
       * Since this is an one-off result, immediately remove the callback from
       * global object to avoid polluting it.
       */
      delete globalObject[callbackName];
    };

    funcToWrap(callbackName)();
  });
}

/**
 * Convert the callback to a stream to receive continual values.
 * @param globalObject The global object - generally window.
 * @param param1 Parameters for stream creation.
 * @return A stream that can be subscribed to.
 */
function streamCallback(
  globalObject: any,
  { callbackNameFunc, funcToWrap }: Omit<Params, 'funcNameToWrap'>
): DataStream {
  return {
    subscribe: ({ onValue, onComplete }): Subscription => {
      /** Generate callback name dynamically to make this stream idempotent. */
      const callbackName = callbackNameFunc();
      let subscription: Subscription;

      globalObject[callbackName] = (
        data: CallbackResult | StreamEventResult
      ) => {
        if (isType<CallbackResult>(data, 'result', 'error', 'status_code')) {
          onValue(data);
        } else {
          switch (data.event) {
            case StreamEvent.STREAM_TERMINATED:
              subscription.unsubscribe();
              break;
          }
        }
      };

      funcToWrap(callbackName)();

      subscription = createSubscription(() => {
        /**
         * Native should check for the existence of this callback every time a
         * value is bound to be delivered. If no such callback exists, it may
         * be assumed that the web client has unsubscribed from this stream, and
         * therefore the stream may be terminated on the mobile side.
         */
        delete globalObject[callbackName];
        if (!!onComplete) onComplete();
      });

      return subscription;
    }
  };
}

/**
 * Handle the simplication of callbacks for both single asynchronous return
 * values and streams.
 * @param globalObject The global object - generally window.
 * @param param1 Parameters for callback simplification.
 * @return Check the return types for private functions in this module.
 */
export function simplifyCallback(
  globalObject: any,
  { funcNameToWrap, ...restParams }: Params
) {
  if (isStreamFunction(funcNameToWrap)) {
    return streamCallback(globalObject, restParams);
  }

  return promisifyCallback(globalObject, restParams);
}
