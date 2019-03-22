import { Omit } from 'ts-essentials';
import { createSubscription, Stream, Subscription } from './subscription';
import { CallbackResult, isStreamFunction } from './utils';

type Params = Readonly<{
  /** The name of the function to be wrapped. */
  funcNameToWrap: string;

  /** The method being wrapped. */
  funcToWrap: Function;

  /** The name of the callback that will receive the results. */
  callbackName: string;
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
  { callbackName, funcToWrap }: Omit<Params, 'funcNameToWrap'>
): PromiseLike<any> {
  return new Promise(resolve => {
    globalObject[callbackName] = (data: CallbackResult) => resolve(data);
    funcToWrap();
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
  { callbackName, funcToWrap }: Omit<Params, 'funcNameToWrap'>
): Stream {
  return {
    subscribe: (onValue: (data: CallbackResult) => unknown): Subscription => {
      globalObject[callbackName] = (data: CallbackResult) => onValue(data);
      funcToWrap();

      return createSubscription(() => {
        /**
         * Native should check for the existence of this callback every time a
         * value is bound to be delivered. If no such callback exists, it may
         * be assumed that the web client has unsubscribed from this stream, and
         * therefore the stream may be terminated on the mobile side.
         */
        delete globalObject[callbackName];
      });
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

/**
 * Set up global callback to handle multiple request IDs. This will be invoked
 * only once, and should be done lazily, i.e. when the method is called for the
 * first time.
 * @param globalObject The global object - generally window.
 * @param param1 The required parameters.
 */
export function setupGlobalCallback(
  globalObject: any,
  {
    funcNameToWrap,
    callbackNameFunc
  }: Readonly<{
    /** The name of the function to be wrapped. */
    funcNameToWrap: string;

    /** Get the name of the relevant callback. */
    callbackNameFunc: (requestID: number | string | null) => string;
  }>
) {
  const globalCallbackName = callbackNameFunc(null);

  if (!globalObject[globalCallbackName]) {
    /**
     * This is the global callback for this method. Native code will need to
     * invoke this callback in order to pass results to web.
     */
    globalObject[globalCallbackName] = ({
      requestID,
      ...callbackRest
    }: CallbackResult &
      Readonly<{
        /** The request ID to access the correct callback. */
        requestID: string;
      }>) => {
      const callbackName = callbackNameFunc(requestID);
      globalObject[callbackName](callbackRest);

      /**
       * If the function being wrapped does not return a stream, remove the
       * callback because this is a one-off operation.
       */
      if (!isStreamFunction(funcNameToWrap)) {
        delete globalObject[callbackName];
      }
    };
  }
}
