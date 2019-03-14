// @ts-check
/**
 * @typedef ModuleMethodParameter
 * @property {string} paramName
 * @property {*} paramValue
 * @typedef ModuleMethodError
 * @property {string} message
 * @property {boolean} isError
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
 * @typedef PromisifyParams
 * @property {string} moduleName The name of the module that owns the method.
 * @property {string} funcName The name of the method being wrapped.
 * @property {Function} funcToWrap The method being wrapped.
 * @property {number} requestID A unique request ID that can be used to
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
  const globalCallbackName = `${moduleName}_${funcName}Callback`;

  return new Promise((resolve, reject) => {
    /**
     * @param {*} callbackID
     * @param {* | ModuleMethodError} arg
     */
    globalObject[globalCallbackName] = (callbackID, arg) => {
      /** @type {keyof ModuleMethodError} */
      const errorKey = "isError";
      !!arg[errorKey] ? reject(arg) : resolve(arg);
    };

    funcToWrap();
  });
}

/**
 * Wrap an Android module.
 * @param {*} globalObject The global object - generally window.
 * @param {string} moduleName The name of the module that owns the method.
 * @param {*} module The Android module being wrapped.
 * @return {*} The wrapped module.
 */
export function wrapAndroidModule(globalObject, moduleName, module) {
  const wrappedModule = getModuleKeys(module)
    .filter(key => typeof module[key] === "function")
    .map(key => {
      /** @type {number} */
      var currentRequestID = 0;

      return {
        /** @param {*} args The method arguments */
        [key]: (...args) => {
          const requestID = ++currentRequestID;
          const funcToWrap = module[key].bind(module, requestID, ...args);

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
 * @param {*} module The iOS module being wrapped.
 * @return {*} The wrapped module.
 */
export function wrapIOSModule(globalObject, moduleName, module) {
  /** @type {{[K: string] : number}} */
  const methodRequestIDMap = {};

  return {
    /**
     * @param {string} method The name of the method being invoked.
     * @param {ModuleMethodParameter[]} args The method arguments.
     */
    invoke: (method, ...args) => {
      const requestID = (methodRequestIDMap[method] || -1) + 1;
      methodRequestIDMap[method] = requestID;

      const funcToWrap = module.postMessage.bind(module, {
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
        requestID
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
