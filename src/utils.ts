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
 * Get the keys of a module.
 * @param module The module being wrapped.
 * @return Array of module keys.
 */
export function getModuleKeys<Module>(module: Module) {
  return [
    ...Object.keys(module),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(module))
  ];
}

/**
 * Check if a function returns a stream.
 * @param funcName The name of the function.
 */
export function isStreamFunction(funcName: string) {
  return funcName.toLowerCase().endsWith('stream');
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
