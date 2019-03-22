import { Omit } from 'ts-essentials';
import { CallbackResult } from './common';

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
  return promisifyCallback(globalObject, restParams);
}

/**
 * Set up global callback to handle multiple request IDs.
 * @param globalObject The global object - generally window.
 * @param param1 The required parameters.
 */
export function setupGlobalCallback(
  globalObject: any,
  {
    callbackNameFunc
  }: Readonly<{
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
      globalObject[callbackName] && globalObject[callbackName](callbackRest);
      delete globalObject[callbackName];
    };
  }
}
