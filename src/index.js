// @ts-check
/**
 * @typedef CallbackResult
 * @property {*} result The result of the operation.
 * @property {*} error The error object, if any.
 * @property {number} status_code The status code.
 *
 * @typedef GetCallbackNameParams
 * @property {string} moduleName The name of the module that owns the method.
 * @property {string} funcName The name of the method being wrapped.
 * @property {number | string | null} requestID The request ID of the callback.
 *
 * @typedef GlobalCallbackResult
 * @property {string} requestID The request ID to access the correct callback.
 * @property {*} result The result of the operation.
 * @property {*} error The error object, if any.
 * @property {number} status_code The status code.
 *
 * @typedef IOSModuleMethodParameter
 * @property {string} method The method name.
 * @property {*} parameters The method parameters.
 * @property {string} callbackName The name of the callback.
 *
 * @typedef ModuleMethodParameter
 * @property {string} paramName The name of the parameter.
 * @property {*} paramValue The parameter value.
 *
 * @typedef PromisifyParams
 * @property {string} moduleName The name of the module that owns the method.
 * @property {string} funcName The name of the method being wrapped.
 * @property {Function} funcToWrap The method being wrapped.
 * @property {string} requestID A unique request ID that can be used to
 * distinguish one request from another.
 *
 * @typedef SetUpGlobalCallbackParams
 * @property {string} moduleName The name of the module that owns the method.
 * @property {string} funcName The name of the method being wrapped.
 * @property {() => number} currentRequestIDFunc Get the current request ID.
 */

/**
 * Get the keys of a module.
 * @param {*} module The module being wrapped.
 * @return {string[]} Array of module keys.
 */
function getModuleKeys(module) {
  return [
    ...Object.keys(module),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(module))
  ];
}

/**
 * Get the callback name that will be used to access global callback.
 * @param {GetCallbackNameParams} param0 The required parameters.
 * @return {string} The combined callback name.
 */
function getCallbackName({ moduleName, funcName, requestID: req }) {
  return `${moduleName}_${funcName}Callback${req !== null ? `_${req}` : ""}`;
}

/**
 * For web bridges, native code will run a JS script that accesses a global
 * callback related to the module's method being wrapped and pass in results so
 * that partner app can access them. This function promisifies this callback to
 * support async-await/Promise.
 * @param {*} globalObject The global object - generally window.
 * @param {PromisifyParams} param1 Parameters for promisify.
 * @return {Promise<unknown>} Promise that handles the callback.
 */
function promisifyCallback(globalObject, { funcToWrap, ...rest }) {
  const callbackName = getCallbackName(rest);

  return new Promise(resolve => {
    /** @param {CallbackResult} data */
    globalObject[callbackName] = data => resolve(data);
    funcToWrap();
  });
}

/**
 * Set up global callback to handle multiple request IDs.
 * @param {*} globalObject The global object - generally window.
 * @param {SetUpGlobalCallbackParams} param1 The required parameters.
 */
function setUpGlobalCallback(globalObject, { currentRequestIDFunc, ...rest }) {
  const globalCallbackName = getCallbackName({ ...rest, requestID: null });

  if (!globalObject[globalCallbackName]) {
    /**
     * This is the global callback for this method. Native code will need to
     * invoke this callback in order to pass results to web.
     * @param {GlobalCallbackResult} param0 The returned callback request ID.
     */
    globalObject[globalCallbackName] = ({ requestID, ...callbackRest }) => {
      const callbackName = getCallbackName({ ...rest, requestID });
      globalObject[callbackName] && globalObject[callbackName](callbackRest);
      delete globalObject[callbackName];
    };
  }
}

/**
 * Wrap an Android module.
 * @param {*} globalObject The global object - generally window.
 * @param {string} moduleName The name of the module that owns the method.
 * @param {*} moduleObj The Android module being wrapped.
 * @return {*} The wrapped module.
 */
export function wrapAndroidModule(globalObject, moduleName, moduleObj) {
  const wrappedModule = getModuleKeys(moduleObj)
    .filter(key => typeof moduleObj[key] === "function")
    .map(key => {
      /** @type {number} */
      var currentRequestID = 0;

      setUpGlobalCallback(globalObject, {
        currentRequestIDFunc: () => currentRequestID,
        moduleName,
        funcName: key
      });

      return {
        /** @param {*} methodParams The method parameters */
        [key]: (...methodParams) => {
          const requestID = `${++currentRequestID}`;

          return promisifyCallback(globalObject, {
            moduleName,
            funcName: key,
            funcToWrap: moduleObj[key].bind(
              moduleObj,
              requestID,
              ...methodParams
            ),
            requestID
          });
        }
      };
    })
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return {
    /**
     * @param {string} method The name of the method being invoked.
     * @param {ModuleMethodParameter[]} methodParams The method parameters.
     */
    invoke: (method, ...methodParams) =>
      wrappedModule[method](...methodParams.map(({ paramValue }) => paramValue))
  };
}

/**
 * Wrap an iOS module.
 * @param {*} globalObject The global object - generally window.
 * @param {string} moduleName The name of the module that owns the method.
 * @param {*} moduleObj The iOS module being wrapped.
 * @return {*} The wrapped module.
 */
export function wrapIOSModule(globalObject, moduleName, moduleObj) {
  /** @type {{[K: string] : number}} */
  const methodRequestIDMap = {};

  return {
    /**
     * @param {string} method The name of the method being invoked.
     * @param {ModuleMethodParameter[]} methodParams The method parameters.
     */
    invoke: (method, ...methodParams) => {
      const requestID = (methodRequestIDMap[method] || -1) + 1;
      methodRequestIDMap[method] = requestID;

      setUpGlobalCallback(globalObject, {
        currentRequestIDFunc: () => methodRequestIDMap[method],
        moduleName,
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
 * @param {string} paramName The parameter name.
 * @param {*} paramValue The parameter value.
 * @return {ModuleMethodParameter} A Parameter object.
 */
export function createModuleMethodParameter(paramName, paramValue) {
  return { paramName, paramValue };
}

/**
 * Wrap the appropriate module based on whether or not it's Android/iOS.
 * @param {*} globalObject The global object - generally window.
 * @param {string} moduleName The name of the module being wrapped.
 */
export function wrapModule(globalObject, moduleName) {
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
