import { CallbackResult } from './common';

/**
 * Set up global callback to handle multiple request IDs.
 * @param globalObject The global object - generally window.
 * @param param1 The required parameters.
 */
export default function(
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
