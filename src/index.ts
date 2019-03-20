type CallbackResult = Readonly<{
  /** The result of the operation. */
  result: unknown;

  /** The error object, if any. */
  error: unknown;

  /** The status code. */
  status_code: number;
}>;

type GlobalCallbackResult = CallbackResult &
  Readonly<{
    /** The request ID to access the correct callback. */
    requestID: string;
  }>;

type GetCallbackNameParams = Readonly<{
  /** The name of the module that owns the method. */
  moduleName: string;

  /** The name of the method being wrapped. */
  funcName: string;

  /** The request ID of the callback. */
  requestID: number | string | null;
}>;

type PromisifyParams = Readonly<{
  /** The name of the module that owns the method. */
  moduleName: string;

  /** The name of the method being wrapped. */
  funcName: string;

  /** The method being wrapped. */
  funcToWrap: Function;

  /**
   * A unique request ID that can be used to distinguish one request from
   * another.
   */
  requestID: string;
}>;

type SetUpGlobalCallbackParams = Readonly<{
  /** The name of the module that owns the method. */
  moduleName: string;

  /** The name of the method being wrapped. */
  funcName: string;

  /** Get the current request ID. */
  currentRequestIDFunc: () => number;
}>;

/** Represents an iOS module */
export type IOSModule = Readonly<{
  postMessage: (params: IOSModuleMethodParameter) => unknown;
}>;

/** Method parameters for iOS. */
export type IOSModuleMethodParameter = Readonly<{
  /** The method name. */
  method: string;

  /** The method parameters. */
  parameters: Readonly<{ requestID: string | number; [K: string]: unknown }>;

  /** The name of the callback. */
  callbackName: string;
}>;

/** Method parameters for cross-platform usage. */
export type ModuleMethodParameter = Readonly<{
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
}: GetCallbackNameParams): string {
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
  { funcToWrap, ...rest }: PromisifyParams
): PromiseLike<unknown> {
  const callbackName = getCallbackName(rest);

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
  { currentRequestIDFunc, ...rest }: SetUpGlobalCallbackParams
) {
  const globalCallbackName = getCallbackName({ ...rest, requestID: null });

  if (!globalObject[globalCallbackName]) {
    /**
     * This is the global callback for this method. Native code will need to
     * invoke this callback in order to pass results to web.
     * @param {GlobalCallbackResult} param0 The returned callback request ID.
     */
    globalObject[globalCallbackName] = ({
      requestID,
      ...callbackRest
    }: GlobalCallbackResult) => {
      const callbackName = getCallbackName({ ...rest, requestID });
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
export function wrapAndroidModule<Module extends { [K: string]: any }>(
  globalObject: any,
  moduleName: string,
  moduleObj: Module
): any {
  const wrappedModule = getModuleKeys(moduleObj)
    .filter(key => typeof moduleObj[key] === 'function')
    .map((key: keyof Module & string) => {
      let currentRequestID = 0;

      setUpGlobalCallback(globalObject, {
        moduleName,
        currentRequestIDFunc: () => currentRequestID,
        funcName: key
      });

      return {
        [key]: (...methodParams: any[]) => {
          const requestID = `${currentRequestID}`;
          currentRequestID += 1;

          return promisifyCallback(globalObject, {
            moduleName,
            requestID,
            funcName: key,
            funcToWrap: moduleObj[key].bind(
              moduleObj,
              requestID,
              ...methodParams
            )
          });
        }
      };
    })
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return {
    /**
     * @param method The name of the method being invoked.
     * @param methodParams The method parameters.
     */
    invoke: (method: string, ...methodParams: ModuleMethodParameter[]) =>
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
export function wrapIOSModule(
  globalObject: any,
  moduleName: string,
  moduleObj: IOSModule
): any {
  const methodRequestIDMap: { [K: string]: number } = {};

  return {
    /**
     * @param method The name of the method being invoked.
     * @param methodParams The method parameters.
     */
    invoke: (method: string, ...methodParams: ModuleMethodParameter[]) => {
      const requestID = (methodRequestIDMap[method] || -1) + 1;
      methodRequestIDMap[method] = requestID;

      setUpGlobalCallback(globalObject, {
        moduleName,
        currentRequestIDFunc: () => methodRequestIDMap[method],
        funcName: method
      });

      /** @type {IOSModuleMethodParameter} */
      const nativeMethodParams = {
        method,
        parameters: {
          ...methodParams
            .map(({ paramName, paramValue }) => ({ [paramName]: paramValue }))
            .reduce((acc, item) => ({ ...acc, ...item }), {}),
          requestID
        },
        callbackName: getCallbackName({
          moduleName,
          funcName: method,
          requestID: null
        })
      };

      return promisifyCallback(globalObject, {
        moduleName,
        funcName: method,
        funcToWrap: moduleObj.postMessage.bind(moduleObj, nativeMethodParams),
        requestID: `${requestID}`
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
export function createModuleMethodParameter(
  paramName: ModuleMethodParameter['paramName'],
  paramValue: ModuleMethodParameter['paramValue']
): ModuleMethodParameter {
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
    globalObject.webkit.messageHandlers[moduleName] = wrappedModule;
  }
}
