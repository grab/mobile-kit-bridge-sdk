/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type StringKeys<T> = Extract<keyof T, string>;

/** Default parameters that must be present in all calls. */
export type DefaultParameters = Readonly<{ isStream: unknown }>;

/** Method parameters for native methods. */
export type NativeParameter<Params = { [K: string]: unknown }> = Readonly<{
  /** The module name. */
  module: string;

  /** The method name. */
  method: string;

  /** The method parameters. */
  parameters: Params;

  /** The name of the callback. */
  callback: string;
}>;

export type CallbackResult<T = unknown> = Readonly<{
  /** The result of the operation. */
  result: T;

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
export function getObjectKeys<T>(object: T) {
  return [
    ...Object.keys(object),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(object))
  ];
}

/**
 * Get the callback name that will be used to access global callback.
 * @param param0 The required parameters.
 * @return The combined callback name.
 */
export function getCallbackName({
  moduleName,
  funcName,
  requestID: req
}: Readonly<{
  /** The name of the module that owns the method. */
  moduleName: string;

  /** The name of the method being wrapped. */
  funcName: string;

  /** The request ID of the callback. */
  requestID: number | string | null;
}>): string {
  return `${moduleName}_${funcName}Callback${req !== null ? `_${req}` : ''}`;
}

/**
 * Check if an object is of a certain type.
 * @param object Some object.
 * @return Whether the object is of this type.
 */
export function isType<T, K extends StringKeys<T> = StringKeys<T>>(
  object: unknown,
  ...keys: K[]
): object is T {
  if (!object) return false;
  const objectKeys = getObjectKeys(object);
  return keys.every(key => objectKeys.indexOf(key) >= 0);
}

/**
 * Wrap a module name to mark it as wrapped.
 * @param moduleName The original module name.
 * @return The wrapped module name.
 */
export function wrapModuleName(moduleName: string) {
  return `Wrapped${moduleName}`;
}
