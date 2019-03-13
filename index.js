import getParameterNames from "get-parameter-names";

function wrapAndroidKit(kit) {
  return Object.keys(kit)
    .map(key => ({
      [key]: (() => {
        const value = kitName[key];

        if (typeof value === "function") {
          return async (...args) => value.bind(kit).call(...args);
        }

        return value;
      })()
    }))
    .reduce((acc, item) => ({ ...acc, ...item }), {});
}

function wrapIOSKit(kit) {
  return Object.keys(kit)
    .map(key => ({
      [key]: (() => {
        const value = kitName[key];

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
    const wrappedKit = wrapAndroidKit(androidKit);
    window[kitName] = wrappedKit;
  } else if (
    !!window.webkit &&
    !!window.webkit.messageHandlers &&
    !!window.webkit.messageHandlers[kitName]
  ) {
    const iOSKit = window.webkit.messageHandlers[kitName];
    const wrappedKit = wrapIOSKit(iOSKit);
    window.webkit.messageHandlers[kitName] = wrappedKit;
  }
}
