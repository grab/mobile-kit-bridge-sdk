function getKitKeys(kit) {
  return [
    ...Object.keys(kit),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(kit))
  ];
}

function getGlobalCallbackName(funcName) {
  return `${funcName}Callback`;
}

function promisifyCallback(globalObject, globalCallbackName, funcToWrap) {
  return new Promise((resolve, reject) => {
    globalObject[globalCallbackName] = arg => resolve(arg);
    funcToWrap();
  });
}

export function wrapAndroidKit(globalObject, kit) {
  return getKitKeys(kit)
    .filter(key => typeof kit[key] === "function")
    .map(key => ({
      [key]: async (...args) => {
        const globalCallbackName = getGlobalCallbackName(key);
        const funcToWrap = kit[key].bind(kit, ...args);
        return promisifyCallback(globalObject, globalCallbackName, funcToWrap);
      }
    }))
    .reduce((acc, item) => ({ ...acc, ...item }), {});
}

export function wrapIOSKit(singleton, kit) {
  return getKitKeys(kit)
    .map(key => ({
      [key]: (() => {
        const value = kit[key];

        if (typeof value === "function") {
          return async (...args) => value.bind(kit).call(...args);
        }

        return value;
      })()
    }))
    .reduce((acc, item) => ({ ...acc, ...item }), {});
}

export function wrapKit(kitName) {
  if (!!window[kitName]) {
    const androidKit = window[kitName];
    const wrappedKit = wrapAndroidKit(window, androidKit);
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
