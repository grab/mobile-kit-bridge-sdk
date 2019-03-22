import { CallbackResult } from './common';

/**
 * For web bridges, native code will run a JS script that accesses a global
 * callback related to the module's method being wrapped and pass in results so
 * that partner app can access them. This function promisifies this callback to
 * support async-await/Promise.
 * @param globalObject The global object - generally window.
 * @param param1 Parameters for promisify.
 * @return Promise that handles the callback.
 */
export default function (
  globalObject: any,
  {
    callbackName,
    funcToWrap
  }: Readonly<{
    /** The method being wrapped. */
    funcToWrap: Function;

    /** The name of the callback that will receive the results. */
    callbackName: string;
  }>
): PromiseLike<any> {
  return new Promise(resolve => {
    globalObject[callbackName] = (data: CallbackResult) => resolve(data);
    funcToWrap();
  });
}
