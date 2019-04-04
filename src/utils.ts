export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type StringKeys<T> = Extract<keyof T, string>;

/** Default parameters that must be present in all calls. */
export type DefaultParameters = Readonly<{ isStream: unknown }>;

/** Method parameters for native methods. */
export type NativeParameter<MethodKey, Params> = Readonly<{
  /** The method name. */
  method: MethodKey;

  /** The method parameters. */
  parameters: Params & DefaultParameters;

  /** The name of the callback. */
  callback: string;
}>;

export type CallbackResult = Readonly<{
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
  const objectKeys = getObjectKeys(object);
  return !!object && keys.every(key => objectKeys.indexOf(key) >= 0);
}
