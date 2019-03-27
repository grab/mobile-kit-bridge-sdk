export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type StringKeys<T> = Extract<keyof T, string>;

export type CallbackResult = Readonly<{
  /** The result of the operation. */
  result: unknown;

  /** The error object, if any. */
  error: unknown;

  /** The status code. */
  status_code: number;
}>;

/** Method parameters for cross-platform usage. */
export type WrappedMethodParameter = Readonly<{
  /** The name of the parameter. */
  paramName: string;

  /** The parameter value. */
  paramValue: unknown;
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
 * Check if a function returns a stream.
 * @param funcName The name of the function.
 */
export function isStreamFunction(funcName: string) {
  return funcName.toLowerCase().startsWith('observe');
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
 * Create a parameter object to work with both Android and iOS module wrappers.
 * @param paramName The parameter name.
 * @param paramValue The parameter value.
 * @return A Parameter object.
 */
export function createMethodParameter(
  paramName: WrappedMethodParameter['paramName'],
  paramValue: WrappedMethodParameter['paramValue']
): WrappedMethodParameter {
  return { paramName, paramValue };
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
  const objectKeys = getObjectKeys(object);
  return keys.every(key => objectKeys.indexOf(key) >= 0);
}
