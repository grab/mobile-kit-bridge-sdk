import { simplifyCallback } from './simplify-callback';
import { getCallbackName, NativeParameter } from './utils';

/** Method parameters for iOS. */
export type IOSMethodParameter<
  MethodKey,
  Params = Readonly<{ [K: string]: unknown }>
> = NativeParameter<MethodKey, Params>;

/** Represents an iOS module. */
type IOSModule<MethodKeys extends string> = Readonly<{
  postMessage: (params: IOSMethodParameter<MethodKeys>) => unknown;
}>;

/** Represents a wrapped IOS module. */
type WrappedIOSModule<MethodKeys extends string> = Readonly<{
  invoke: <MethodKey extends MethodKeys>(
    method: MethodKey,
    params: IOSMethodParameter<MethodKeys>['parameters']
  ) => unknown;
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
    invoke: (method, params) => {
      return simplifyCallback(globalObject, {
        funcNameToWrap: method,
        callbackNameFunc: () => {
          const requestID = methodRequestIDMap[method] || 0;
          methodRequestIDMap[method] = requestID + 1;
          return getCallbackName({ moduleName, requestID, funcName: method });
        },
        funcToWrap: callback =>
          moduleObj.postMessage.bind(moduleObj, {
            callback,
            method,
            parameters: params
          })
      });
    }
  };
}
