import { simplifyCallback } from './simplify-callback';
import { getCallbackName, Omit, WrappedMethodParameter } from './utils';

/** Represents an iOS module. */
type IOSModule<MethodKeys extends string> = Readonly<{
  postMessage: (params: IOSMethodParameter<MethodKeys>) => unknown;
}>;

/** Represents a wrapped IOS module. */
type WrappedIOSModule<MethodKeys extends string> = Readonly<{
  invoke: <MethodKey extends MethodKeys>(
    method: MethodKey,
    ...params: WrappedMethodParameter[]
  ) => unknown;
}>;

/** Method parameters for iOS. */
export type IOSMethodParameter<MethodKeys extends string> = Readonly<{
  /** The method name. */
  method: MethodKeys;

  /** The method parameters. */
  parameters: Readonly<{ [K: string]: unknown }>;

  /** The name of the callback. */
  callbackName: string;
}>;

/**
 * Wrap an iOS module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObj The iOS module being wrapped.
 * @return The wrapped module.
 */
export function wrapIOSModule<MethodKeys extends string>(
  globalObject: any,
  moduleName: string,
  moduleObj: IOSModule<MethodKeys>
): WrappedIOSModule<MethodKeys> {
  const methodRequestIDMap: { [K: string]: number } = {};

  return {
    invoke: <MethodKey extends MethodKeys>(
      method: MethodKey,
      ...methodParams: WrappedMethodParameter[]
    ) => {
      const callbackNameFunc = () => {
        const requestID = methodRequestIDMap[method] || 0;
        methodRequestIDMap[method] = requestID + 1;
        return getCallbackName({ moduleName, requestID, funcName: method });
      };

      const nativeMethodParams: Omit<
        IOSMethodParameter<MethodKeys>,
        'callbackName'
      > = {
        method,
        parameters: {
          ...methodParams
            .map(({ paramName, paramValue }) => ({ [paramName]: paramValue }))
            .reduce((acc, item) => ({ ...acc, ...item }), {})
        }
      };

      return simplifyCallback(globalObject, {
        callbackNameFunc,
        funcNameToWrap: method,
        funcToWrap: callbackName =>
          moduleObj.postMessage.bind(moduleObj, {
            ...nativeMethodParams,
            callbackName
          })
      });
    }
  };
}
