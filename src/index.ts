import { WrappedMethodParameter } from './common';
import setupGlobal from './setup-global';
import simplifyCallback from './simplify-callback';
import { getCallbackName, getModuleKeys } from './utils';

type StringKeys<T> = Extract<keyof T, string>;

/** Represents an Android module. */
type AndroidModule = Readonly<{
  [K: string]: (...params: any[]) => unknown;
}>;

/**
 * Represents a wrapped Android module. Each method in the original module is
 * mapped to a method key along with its actual parameters.
 */
type WrappedAndroidModule<Original extends AndroidModule> = Readonly<{
  invoke: <MethodKey extends StringKeys<Original>>(
    method: MethodKey,
    ...params: WrappedMethodParameter[]
  ) => PromiseLike<ReturnType<Original[MethodKey]>>;
}>;

/** Represents an iOS module. */
type IOSModule<MethodKeys extends string> = Readonly<{
  postMessage: (params: IOSMethodParameter<MethodKeys>) => unknown;
}>;

/** Represents a wrapped IOS module. */
type WrappedIOSModule<MethodKeys extends string> = Readonly<{
  invoke: <MethodKey extends MethodKeys>(
    method: MethodKey,
    ...params: WrappedMethodParameter[]
  ) => PromiseLike<unknown>;
}>;

/** Method parameters for iOS. */
export type IOSMethodParameter<MethodKeys extends string> = Readonly<{
  /** The method name. */
  method: MethodKeys;

  /** The method parameters. */
  parameters: Readonly<{ requestID: string | number; [K: string]: unknown }>;

  /** The name of the callback. */
  callbackName: string;
}>;

/**
 * Wrap an Android module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObj The Android module being wrapped.
 * @return The wrapped module.
 */
export function wrapAndroidModule<Module extends AndroidModule>(
  globalObject: any,
  moduleName: string,
  moduleObj: Module
): WrappedAndroidModule<Module> {
  const wrappedModule = getModuleKeys(moduleObj)
    .filter(key => typeof moduleObj[key] === 'function')
    .map((key: keyof Module & string) => {
      let currentRequestID = 0;

      const callbackNameFunc = (requestID: number | string | null) =>
        getCallbackName({ moduleName, requestID, funcName: key });

      setupGlobal(globalObject, { callbackNameFunc });

      return {
        [key]: (...methodParams: any[]) => {
          const requestID = `${currentRequestID}`;
          currentRequestID += 1;

          return simplifyCallback(globalObject, {
            callbackName: callbackNameFunc(requestID),
            funcToWrap: moduleObj[key].bind(
              moduleObj,
              requestID,
              ...methodParams,
              callbackNameFunc(null)
            )
          });
        }
      };
    })
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return {
    invoke: <MethodKey extends StringKeys<Module>>(
      method: MethodKey,
      ...methodParams: WrappedMethodParameter[]
    ) =>
      wrappedModule[method](...methodParams.map(({ paramValue }) => paramValue))
  };
}

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
      const requestID = (methodRequestIDMap[method] || -1) + 1;
      methodRequestIDMap[method] = requestID;

      const callbackNameFunc = (requestID: number | string | null) =>
        getCallbackName({ moduleName, requestID, funcName: method });

      setupGlobal(globalObject, { callbackNameFunc });

      const nativeMethodParams: IOSMethodParameter<MethodKeys> = {
        method,
        parameters: {
          ...methodParams
            .map(({ paramName, paramValue }) => ({ [paramName]: paramValue }))
            .reduce((acc, item) => ({ ...acc, ...item }), {}),
          requestID
        },
        callbackName: callbackNameFunc(null)
      };

      return simplifyCallback(globalObject, {
        callbackName: callbackNameFunc(requestID),
        funcToWrap: moduleObj.postMessage.bind(moduleObj, nativeMethodParams)
      });
    }
  };
}

/**
 * Wrap the appropriate module based on whether or not it's Android/iOS.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module being wrapped.
 */
export function wrapModule(globalObject: any, moduleName: string) {
  if (!!globalObject[moduleName]) {
    const androidModule = globalObject[moduleName];
    const wrappedModule = wrapAndroidModule(window, moduleName, androidModule);
    globalObject[moduleName] = wrappedModule;
  } else if (
    !!globalObject.webkit &&
    !!globalObject.webkit.messageHandlers &&
    !!globalObject.webkit.messageHandlers[moduleName]
  ) {
    const iOSModule = globalObject.webkit.messageHandlers[moduleName];
    const wrappedModule = wrapIOSModule(globalObject, moduleName, iOSModule);
    globalObject[moduleName] = wrappedModule;
  }
}
