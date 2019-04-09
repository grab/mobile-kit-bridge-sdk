/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export declare type StringKeys<T> = Extract<keyof T, string>;
/** Default parameters that must be present in all calls. */
export declare type DefaultParameters = Readonly<{
    isStream: unknown;
}>;
/** Method parameters for native methods. */
export declare type NativeParameter<Params = {
    [K: string]: unknown;
}> = Readonly<{
    /** The method name. */
    method: string;
    /** The method parameters. */
    parameters: Params;
    /** The name of the callback. */
    callback: string;
}>;
export declare type CallbackResult = Readonly<{
    /** The result of the operation. */
    result: unknown;
    /** The error object, if any. */
    error: unknown;
    /** The status code. */
    status_code: number;
}>;
/**
 * Get the keys of an object.
 * @param object Some object.
 * @return Array of object keys.
 */
export declare function getObjectKeys<T>(object: T): string[];
/**
 * Get the callback name that will be used to access global callback.
 * @param param0 The required parameters.
 * @return The combined callback name.
 */
export declare function getCallbackName({ moduleName, funcName, requestID: req }: Readonly<{
    /** The name of the module that owns the method. */
    moduleName: string;
    /** The name of the method being wrapped. */
    funcName: string;
    /** The request ID of the callback. */
    requestID: number | string | null;
}>): string;
/**
 * Check if an object is of a certain type.
 * @param object Some object.
 * @return Whether the object is of this type.
 */
export declare function isType<T, K extends StringKeys<T> = StringKeys<T>>(object: unknown, ...keys: K[]): object is T;
/**
 * Wrap a module name to mark it as wrapped.
 * @param moduleName The original module name.
 * @return The wrapped module name.
 */
export declare function wrapModuleName(moduleName: string): string;
