// @ts-check
/**
 * @typedef KitMethodParameter
 * @property {string} paramName
 * @property {*} paramValue
 * @typedef KitMethodError
 * @property {string} message
 * @property {boolean} isError
 */
/**
 * Get the keys of a kit.
 * @param {*} kit The kit being wrapped.
 * @return {string[]} Array of kit keys.
 */
function getKitKeys(kit) {
  return [
    ...Object.keys(kit),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(kit))
  ];
}

/**
 * For web bridges, native code will run a JS script that accesses a global
 * callback related to the kit's method being wrapped and pass in results so
 * that partner app can access them. This function promisifies this callback to
 * support async-await/Promise.
 * @param {*} globalObject The global object - generally window.
 * @param {string} kitName The name of the kit that owns the method.
 * @param {string} funcName The name of the method being wrapped.
 * @param {Function} funcToWrap The method being wrapped.
 * @return {Promise<unknown>} Promise that handles the callback.
 */
function promisifyCallback(globalObject, kitName, funcName, funcToWrap) {
  const globalCallbackName = `${kitName}_${funcName}Callback`;

  return new Promise((resolve, reject) => {
    /** @param {* | KitMethodError} arg */
    globalObject[globalCallbackName] = arg => {
      /** @type {keyof KitMethodError} */
      const errorKey = "isError";
      !!arg[errorKey] ? reject(arg) : resolve(arg);
    };

    funcToWrap();
  });
}

/**
 * Wrap an Android kit.
 * @param {*} globalObject The global object - generally window.
 * @param {string} kitName The name of the kit that owns the method.
 * @param {*} kit The Android kit being wrapped.
 * @return {*} The wrapped kit.
 */
export function wrapAndroidKit(globalObject, kitName, kit) {
  const wrappedKit = getKitKeys(kit)
    .filter(key => typeof kit[key] === "function")
    .map(key => ({
      /** @param {*} args The method arguments */
      [key]: (...args) => {
        const funcToWrap = kit[key].bind(kit, ...args);
        return promisifyCallback(globalObject, kitName, key, funcToWrap);
      }
    }))
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return {
    /**
     * @param {string} method The name of the method being invoked.
     * @param {KitMethodParameter[]} args The method arguments.
     */
    invoke: (method, ...args) =>
      wrappedKit[method](...args.map(({ paramValue }) => paramValue))
  };
}

/**
 * Wrap an iOS kit.
 * @param {*} globalObject The global object - generally window.
 * @param {string} kitName The name of the kit that owns the method.
 * @param {*} kit The iOS kit being wrapped.
 * @return {*} The wrapped kit.
 */
export function wrapIOSKit(globalObject, kitName, kit) {
  return {
    /**
     * @param {string} method The name of the method being invoked.
     * @param {KitMethodParameter[]} args The method arguments.
     */
    invoke: (method, ...args) => {
      const funcToWrap = kit.postMessage.bind(kit, {
        method,
        ...args
          .map(({ paramName, paramValue }) => ({ [paramName]: paramValue }))
          .reduce((acc, item) => ({ ...acc, ...item }), {})
      });

      return promisifyCallback(globalObject, kitName, method, funcToWrap);
    }
  };
}

/**
 * Create a parameter object to work with both Android and iOS kit wrappers.
 * @param {string} paramName The parameter name.
 * @param {*} paramValue The parameter value.
 * @return {KitMethodParameter} A Parameter object.
 */
export function createKitMethodParameter(paramName, paramValue) {
  return { paramName, paramValue };
}

/**
 * Wrap the appropriate kit based on whether or not it's Android/iOS.
 * @param {*} globalObject The global object - generally window.
 * @param {string} kitName The name of the kit being wrapped.
 */
export function wrapKit(globalObject, kitName) {
  if (!!globalObject[kitName]) {
    const androidKit = globalObject[kitName];
    const wrappedKit = wrapAndroidKit(window, kitName, androidKit);
    globalObject[kitName] = wrappedKit;
  } else if (
    !!globalObject.webkit &&
    !!globalObject.webkit.messageHandlers &&
    !!globalObject.webkit.messageHandlers[kitName]
  ) {
    const iOSKit = globalObject.webkit.messageHandlers[kitName];
    const wrappedKit = wrapIOSKit(globalObject, kitName, iOSKit);
    globalObject.webkit.messageHandlers[kitName] = wrappedKit;
  }
}
