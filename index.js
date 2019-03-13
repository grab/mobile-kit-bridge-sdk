// @ts-check
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

  return new Promise(resolve => {
    /** @param {*} arg */
    globalObject[globalCallbackName] = arg => resolve(arg);
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
     * @param {*} args The method arguments.
     */
    invoke: (method, ...args) => wrappedKit[method](...args)
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
     * @param {*} args The method arguments.
     */
    invoke: (method, ...args) => {
      const funcToWrap = kit.postMessage.bind(kit, { ...args, method });
      return promisifyCallback(globalObject, kitName, method, funcToWrap);
    }
  };
}

/** @param {string} kitName The name of the kit being wrapped */
export function wrapKit(kitName) {
  if (!!window[kitName]) {
    const androidKit = window[kitName];
    const wrappedKit = wrapAndroidKit(window, kitName, androidKit);
    window[kitName] = wrappedKit;
  } else if (
    !!window.webkit &&
    !!window.webkit.messageHandlers &&
    !!window.webkit.messageHandlers[kitName]
  ) {
    const iOSKit = window.webkit.messageHandlers[kitName];
    const wrappedKit = wrapIOSKit(window, iOSKit);
    window.webkit.messageHandlers[kitName] = wrappedKit;
  }
}
