/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Wrap the appropriate module based on whether or not it's Android/iOS.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module being wrapped.
 */
export declare function wrapModule(globalObject: any, moduleName: string): void;
