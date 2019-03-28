import { simplifyCallback } from './simplify-callback';
import {
  getCallbackName,
  getObjectKeys,
  StringKeys,
  WrappedMethodParameter
} from './utils';

/** Android method parameters  */
export type AndroidMethodParameter<Params> = Readonly<{
  /** The method name. */
  method: string;

  /** The method parameters. */
  parameters: Params;

  /** The name of the callback. */
  callback: string;
}>;

/** Represents an Android module. */
type AndroidModule = Readonly<{
  [K: string]: (params: AndroidMethodParameter<any>) => unknown;
}>;

/**
 * Represents a wrapped Android module. Each method in the original module is
 * mapped to a method key along with its actual parameters.
 */
type WrappedAndroidModule<Original extends AndroidModule> = Readonly<{
  invoke: <MethodKey extends StringKeys<Original>>(
    method: MethodKey,
    ...params: WrappedMethodParameter[]
  ) => unknown;
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
  const wrappedModule = getObjectKeys(moduleObj)
    .filter(key => typeof moduleObj[key] === 'function')
    .map((key: keyof Module & string) => {
      let currentRequestID = 0;

      const callbackNameFunc = () => {
        const requestID = `${currentRequestID}`;
        currentRequestID += 1;
        return getCallbackName({ moduleName, requestID, funcName: key });
      };

      return {
        [key]: (params: AndroidMethodParameter<any>['parameters']) => {
          return simplifyCallback(globalObject, {
            callbackNameFunc,
            funcNameToWrap: key,
            funcToWrap: callback =>
              moduleObj[key].bind(moduleObj, {
                callback,
                method: key,
                parameters: params
              })
          });
        }
      };
    })
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return {
    invoke: <MethodKey extends StringKeys<Module>>(
      method: MethodKey,
      ...params: WrappedMethodParameter[]
    ) =>
      wrappedModule[method](
        params
          .map(({ paramName, paramValue }) => ({ [paramName]: paramValue }))
          .reduce((acc, item) => ({ ...acc, ...item }))
      )
  };
}
