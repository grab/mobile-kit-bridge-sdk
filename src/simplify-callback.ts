import { CallbackResult } from './common';

type Params = Readonly<{
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
  { callbackName, funcToWrap }: Params
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
 * @param params Parameters for callback simplification.
 * @return Check the return types for private functions in this module.
 */
export default function (globalObject: any, params: Params) {
  return promisifyCallback(globalObject, params);
}
