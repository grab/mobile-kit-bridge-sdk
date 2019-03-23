import { wrapAndroidModule } from './wrap-android';
import { wrapIOSModule } from './wrap-ios';

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
