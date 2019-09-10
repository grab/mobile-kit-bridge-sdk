/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { simplifyCallback } from './simplify-callback';
import { DefaultParameters, getCallbackName, NativeParameter } from './utils';

/** Represents a wrapped generic module. */
type WrappedModule = Readonly<{
  invoke: (
    method: string,
    params:
      | (Readonly<{ [K: string]: unknown }> & DefaultParameters)
      | undefined
      | null
  ) => unknown;
}>;

/**
 * Wrap a generic module. This should work for both Android and iOS-injected
 * Javascript interfaces.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleMethodFunc Function to execute the related module method.
 * @return The wrapped module.
 */
export function wrapGenericModule(
  globalObject: any,
  moduleName: string,
  moduleMethodFunc: (params: NativeParameter) => unknown
): WrappedModule {
  const methodRequestIDMap: { [K: string]: number } = {};

  return {
    invoke: (method, params) => {
      return simplifyCallback(globalObject, {
        funcNameToWrap: method,
        callbackNameFunc: () => {
          const requestID = methodRequestIDMap[method] || 0;
          methodRequestIDMap[method] = requestID + 1;
          return getCallbackName({ moduleName, requestID, funcName: method });
        },
        funcToWrap: callback =>
          moduleMethodFunc({
            callback,
            method,
            module: moduleName,
            parameters: params !== undefined && params !== null ? params : {}
          })
      });
    }
  };
}
