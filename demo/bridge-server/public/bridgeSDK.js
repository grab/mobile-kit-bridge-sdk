(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.bridgeSDK = {}));
}(this, function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
                t[p[i]] = s[p[i]];
        return t;
    }

    /**
     * Create a subscription that can only be unsubscribed from once.
     * @param unsubscribe Unsubscription logic.
     */
    function createSubscription(unsubscribe) {
        let unsubscribed = false;
        return {
            isUnsubscribed: () => unsubscribed,
            unsubscribe: () => {
                if (!unsubscribed) {
                    unsubscribe();
                    unsubscribed = true;
                }
            }
        };
    }

    /**
     * Get the keys of an object.
     * @param object Some object.
     * @return Array of object keys.
     */
    function getObjectKeys(object) {
        return [
            ...Object.keys(object),
            ...Object.getOwnPropertyNames(Object.getPrototypeOf(object))
        ];
    }
    /**
     * Check if a function returns a stream.
     * @param funcName The name of the function.
     */
    function isStreamFunction(funcName) {
        return funcName.toLowerCase().startsWith('observe');
    }
    /**
     * Get the callback name that will be used to access global callback.
     * @param param0 The required parameters.
     * @return The combined callback name.
     */
    function getCallbackName({ moduleName, funcName, requestID: req }) {
        return `${moduleName}_${funcName}Callback${req !== null ? `_${req}` : ''}`;
    }
    /**
     * Check if an object is of a certain type.
     * @param object Some object.
     * @return Whether the object is of this type.
     */
    function isType(object, ...keys) {
        const objectKeys = getObjectKeys(object);
        return keys.every(key => objectKeys.indexOf(key) >= 0);
    }

    (function (StreamEvent) {
        StreamEvent["STREAM_TERMINATED"] = "STREAM_TERMINATED";
    })(exports.StreamEvent || (exports.StreamEvent = {}));
    /**
     * For web bridges, native code will run a JS script that accesses a global
     * callback related to the module's method being wrapped and pass in results so
     * that partner app can access them. This function promisifies this callback to
     * support async-await/Promise.
     * @param globalObject The global object - generally window.
     * @param params Parameters for promisify.
     * @return Promise that resolves to the callback result.
     */
    function promisifyCallback(globalObject, { callbackNameFunc, funcToWrap }) {
        const callbackName = callbackNameFunc();
        return new Promise(resolve => {
            globalObject[callbackName] = (data) => {
                resolve(data);
                /**
                 * Since this is an one-off result, immediately remove the callback from
                 * global object to avoid polluting it.
                 */
                delete globalObject[callbackName];
            };
            funcToWrap(callbackName)();
        });
    }
    /**
     * Convert the callback to a stream to receive continual values.
     * @param globalObject The global object - generally window.
     * @param param1 Parameters for stream creation.
     * @return A stream that can be subscribed to.
     */
    function streamCallback(globalObject, { callbackNameFunc, funcToWrap }) {
        return {
            subscribe: (handlers) => {
                /** Generate callback name dynamically to make this stream idempotent. */
                const callbackName = callbackNameFunc();
                let subscription;
                globalObject[callbackName] = (data) => {
                    if (isType(data, 'status_code')) {
                        handlers && handlers.next && handlers.next(data);
                    }
                    else {
                        switch (data.event) {
                            case exports.StreamEvent.STREAM_TERMINATED:
                                subscription.unsubscribe();
                                break;
                        }
                    }
                };
                funcToWrap(callbackName)();
                subscription = createSubscription(() => {
                    /**
                     * Native should check for the existence of this callback every time a
                     * value is bound to be delivered. If no such callback exists, it may
                     * be assumed that the web client has unsubscribed from this stream, and
                     * therefore the stream may be terminated on the mobile side.
                     */
                    delete globalObject[callbackName];
                    handlers && handlers.complete && handlers.complete();
                });
                return subscription;
            }
        };
    }
    /**
     * Handle the simplication of callbacks for both single asynchronous return
     * values and streams.
     * @param globalObject The global object - generally window.
     * @param param1 Parameters for callback simplification.
     * @return Check the return types for private functions in this module.
     */
    function simplifyCallback(globalObject, _a) {
        var { funcNameToWrap } = _a, restParams = __rest(_a, ["funcNameToWrap"]);
        if (isStreamFunction(funcNameToWrap)) {
            return streamCallback(globalObject, restParams);
        }
        return promisifyCallback(globalObject, restParams);
    }

    /**
     * Wrap an Android module.
     * @param globalObject The global object - generally window.
     * @param moduleName The name of the module that owns the method.
     * @param moduleObj The Android module being wrapped.
     * @return The wrapped module.
     */
    function wrapAndroidModule(globalObject, moduleName, moduleObj) {
        const wrappedModule = getObjectKeys(moduleObj)
            .filter(key => typeof moduleObj[key] === 'function')
            .map((key) => {
            let currentRequestID = 0;
            const callbackNameFunc = () => {
                const requestID = `${currentRequestID}`;
                currentRequestID += 1;
                return getCallbackName({ moduleName, requestID, funcName: key });
            };
            return {
                [key]: (params) => {
                    return simplifyCallback(globalObject, {
                        callbackNameFunc,
                        funcNameToWrap: key,
                        funcToWrap: callback => moduleObj[key].bind(moduleObj, JSON.stringify({
                            callback,
                            method: key,
                            parameters: params
                        }))
                    });
                }
            };
        })
            .reduce((acc, item) => (Object.assign({}, acc, item)), {});
        return {
            invoke: (method, params) => wrappedModule[method](params)
        };
    }

    /**
     * Wrap an iOS module.
     * @param globalObject The global object - generally window.
     * @param moduleName The name of the module that owns the method.
     * @param moduleObj The iOS module being wrapped.
     * @return The wrapped module.
     */
    function wrapIOSModule(globalObject, moduleName, moduleObj) {
        const methodRequestIDMap = {};
        return {
            invoke: (method, params) => {
                return simplifyCallback(globalObject, {
                    funcNameToWrap: method,
                    callbackNameFunc: () => {
                        const requestID = methodRequestIDMap[method] || 0;
                        methodRequestIDMap[method] = requestID + 1;
                        return getCallbackName({ moduleName, requestID, funcName: method });
                    },
                    funcToWrap: callback => moduleObj.postMessage.bind(moduleObj, {
                        callback,
                        method,
                        parameters: params
                    })
                });
            }
        };
    }

    /**
     * Wrap the appropriate module based on whether or not it's Android/iOS.
     * @param globalObject The global object - generally window.
     * @param moduleName The name of the module being wrapped.
     */
    function wrapModule(globalObject, moduleName) {
        if (!!globalObject[moduleName]) {
            const androidModule = globalObject[moduleName];
            const wrappedModule = wrapAndroidModule(window, moduleName, androidModule);
            globalObject[moduleName] = wrappedModule;
        }
        else if (!!globalObject.webkit &&
            !!globalObject.webkit.messageHandlers &&
            !!globalObject.webkit.messageHandlers[moduleName]) {
            const iOSModule = globalObject.webkit.messageHandlers[moduleName];
            const wrappedModule = wrapIOSModule(globalObject, moduleName, iOSModule);
            globalObject[moduleName] = wrappedModule;
        }
    }

    exports.wrapModule = wrapModule;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
