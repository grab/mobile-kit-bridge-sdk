type StringKeys<T> = Extract<keyof T, string>;

type CallbackResult = Readonly<{
  /** The result of the operation. */
  result: unknown;

  /** The error object, if any. */
  error: unknown;

  /** The status code. */
  status_code: number;
}>;

/** Method parameters for cross-platform usage. */
type WrappedMethodParameter = Readonly<{
  /** The name of the parameter. */
  paramName: string;

  /** The parameter value. */
  paramValue: unknown;
}>;

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
 * Get the keys of a module.
 * @param module The module being wrapped.
 * @return Array of module keys.
 */
function getModuleKeys<Module>(module: Module) {
  return [
    ...Object.keys(module),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(module))
  ];
}

/**
 * Get the callback name that will be used to access global callback.
 * @param param0 The required parameters.
 * @return The combined callback name.
 */
function getCallbackName({
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
 * For web bridges, native code will run a JS script that accesses a global
 * callback related to the module's method being wrapped and pass in results so
 * that partner app can access them. This function promisifies this callback to
 * support async-await/Promise.
 * @param globalObject The global object - generally window.
 * @param param1 Parameters for promisify.
 * @return Promise that handles the callback.
 */
function promisifyCallback(
  globalObject: any,
  {
    callbackName,
    funcToWrap
  }: Readonly<{
    /** The method being wrapped. */
    funcToWrap: Function;

    /** The name of the callback that will receive the results. */
    callbackName: string;
  }>
): PromiseLike<any> {
  return new Promise(resolve => {
    globalObject[callbackName] = (data: CallbackResult) => resolve(data);
    funcToWrap();
  });
}

/**
 * Set up global callback to handle multiple request IDs.
 * @param globalObject The global object - generally window.
 * @param param1 The required parameters.
 */
function setUpGlobalCallback(
  globalObject: any,
  {
    callbackNameFunc
  }: Readonly<{
    /** Get the name of the relevant callback. */
    callbackNameFunc: (requestID: number | string | null) => string;
  }>
) {
  const globalCallbackName = callbackNameFunc(null);

  if (!globalObject[globalCallbackName]) {
    /**
     * This is the global callback for this method. Native code will need to
     * invoke this callback in order to pass results to web.
     */
    globalObject[globalCallbackName] = ({
      requestID,
      ...callbackRest
    }: CallbackResult &
      Readonly<{
        /** The request ID to access the correct callback. */
        requestID: string;
      }>) => {
      const callbackName = callbackNameFunc(requestID);
      globalObject[callbackName] && globalObject[callbackName](callbackRest);
      delete globalObject[callbackName];
    };
  }
}

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

      setUpGlobalCallback(globalObject, { callbackNameFunc });

      return {
        [key]: (...methodParams: any[]) => {
          const requestID = `${currentRequestID}`;
          currentRequestID += 1;

          return promisifyCallback(globalObject, {
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

      setUpGlobalCallback(globalObject, { callbackNameFunc });

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

      return promisifyCallback(globalObject, {
        callbackName: callbackNameFunc(requestID),
        funcToWrap: moduleObj.postMessage.bind(moduleObj, nativeMethodParams)
      });
    }
  };
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
