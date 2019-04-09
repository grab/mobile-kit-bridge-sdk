/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { wrapModuleName } from './utils';
import { wrapGenericModule } from './wrap-generic';

/**
 * Wrap the appropriate module based on whether or not it's Android/iOS.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module being wrapped.
 */
export function wrapModule(globalObject: any, moduleName: string) {
  globalObject[wrapModuleName(moduleName)] = wrapGenericModule(
    globalObject,
    moduleName,
    params => {
      if (!!globalObject[moduleName]) {
        globalObject[moduleName][params.method](JSON.stringify(params));
      } else if (
        !!globalObject.webkit &&
        !!globalObject.webkit.messageHandlers &&
        !!globalObject.webkit.messageHandlers[moduleName]
      ) {
        globalObject.webkit.messageHandlers[moduleName].postMessage(params);
      } else {
        throw new Error(
          `Unexpected method '${params.method}' for module '${moduleName}'`
        );
      }
    }
  );
}
