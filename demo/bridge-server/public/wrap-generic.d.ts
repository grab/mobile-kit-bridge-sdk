/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { DefaultParameters, NativeParameter } from './utils';
/** Represents a wrapped generic module. */
declare type WrappedModule = Readonly<{
    invoke: (method: string, params: (Readonly<{
        [K: string]: unknown;
    }> & DefaultParameters) | undefined | null) => unknown;
}>;
/**
 * Wrap a generic module. This should work for both Android and iOS-injected
 * Javascript interfaces.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleMethodFunc Function to execute the related module method.
 * @return The wrapped module.
 */
export declare function wrapGenericModule(globalObject: any, moduleName: string, moduleMethodFunc: (params: NativeParameter) => unknown): WrappedModule;
export {};
