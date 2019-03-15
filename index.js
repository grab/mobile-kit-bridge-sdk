// @ts-check
export const GrabModuleResult = {
  UNAVAILABLE: "UNAVAILABLE"
};

/**
 * @typedef ModuleMethodParameter
 * @property {string} paramName
 * @property {*} paramValue
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
 * @param {string} moduleName The name of the module that owns the method.
 * @param {string} funcName The name of the method being wrapped.
 * @param {number | string | null} req The request ID of the callback.
 * @return {string} The combined callback name.
 */
function getCallbackName(moduleName, funcName, req) {
  return `${moduleName}_${funcName}Callback${req !== null ? `_${req}` : ""}`;
}

/**
 * @typedef PromisifyParams
 * @property {string} moduleName The name of the module that owns the method.
 * @property {string} funcName The name of the method being wrapped.
 * @property {Function} funcToWrap The method being wrapped.
 * @property {string} requestID A unique request ID that can be used to
 * distinguish one request from another.
 *
 * For web bridges, native code will run a JS script that accesses a global
 * callback related to the module's method being wrapped and pass in results so
 * that partner app can access them. This function promisifies this callback to
 * support async-await/Promise.
 * @param {*} globalObject The global object - generally window.
 * @param {PromisifyParams} arg1 Parameters for promisify.
 * @return {Promise<unknown>} Promise that handles the callback.
 */
function promisifyCallback(
  globalObject,
  { moduleName, funcName, funcToWrap, requestID }
) {
  const callbackName = getCallbackName(moduleName, funcName, requestID);

  return new Promise((resolve, reject) => {
    /**
     * @param {* | typeof GrabModuleResult['UNAVAILABLE']} data
     * @param {* | typeof GrabModuleResult['UNAVAILABLE']} err
     */
    globalObject[callbackName] = (data, err) => {
      err !== GrabModuleResult.UNAVAILABLE ? reject(err) : resolve(data);
    };

    funcToWrap();
  });
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
      const globalCallbackName = getCallbackName(moduleName, key, null);

      /**
       * This is the global callback for this method. Native code will need to
       * invoke this callback in order to pass results to web.
       * @param {string} callbackID The returned callback request ID.
       * @param {* | typeof GrabModuleResult['UNAVAILABLE']} data
       * @param {* | typeof GrabModuleResult['UNAVAILABLE']} err
       */
      globalObject[globalCallbackName] = (callbackID, data, err) => {
        const callbackName = getCallbackName(moduleName, key, callbackID);
        globalObject[callbackName] && globalObject[callbackName](data, err);
        delete globalObject[callbackName];
      };

      return {
        /** @param {*} args The method arguments */
        [key]: (...args) => {
          const requestID = `${++currentRequestID}`;
          const funcToWrap = moduleObj[key].bind(moduleObj, requestID, ...args);

          return promisifyCallback(globalObject, {
            moduleName,
            funcName: key,
            funcToWrap,
            requestID
          });
        }
      };
    })
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return {
    /**
     * @param {string} method The name of the method being invoked.
     * @param {ModuleMethodParameter[]} args The method arguments.
     */
    invoke: (method, ...args) =>
      wrappedModule[method](...args.map(({ paramValue }) => paramValue))
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
     * @param {ModuleMethodParameter[]} args The method arguments.
     */
    invoke: (method, ...args) => {
      const globalCallbackName = getCallbackName(moduleName, method, null);
      const requestID = (methodRequestIDMap[method] || -1) + 1;
      methodRequestIDMap[method] = requestID;

      if (!globalObject[globalCallbackName]) {
        /**
         * This is the global callback for this method. Native code will need to
         * invoke this callback in order to pass results to web.
         * @param {string} callbackID The returned callback request ID.
         * @param {* | typeof GrabModuleResult['UNAVAILABLE']} data
         * @param {* | typeof GrabModuleResult['UNAVAILABLE']} err
         */
        globalObject[globalCallbackName] = (callbackID, data, err) => {
          const callbackName = getCallbackName(moduleName, method, callbackID);
          globalObject[callbackName] && globalObject[callbackName](data, err);
          delete globalObject[callbackName];
        };
      }

      const funcToWrap = moduleObj.postMessage.bind(moduleObj, {
        method,
        requestID,
        ...args
          .map(({ paramName, paramValue }) => ({ [paramName]: paramValue }))
          .reduce((acc, item) => ({ ...acc, ...item }), {})
      });

      return promisifyCallback(globalObject, {
        moduleName,
        funcName: method,
        funcToWrap,
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
