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
     * Create a data stream with default functionalities. When we implement
     * Promise functionalities, beware that if then block is executed immediately
     * (i.e. a resolved promise), the subscription object may not be created yet.
     * @param subscribe Injected subscribe function.
     * @return A DataStream instance.
     */
    function createDataStream(subscribe) {
        return {
            subscribe,
            then: onFulfilled => {
                return new Promise(() => {
                    let subscription = null;
                    let didFinish = false;
                    subscription = subscribe({
                        next: data => {
                            !!onFulfilled && onFulfilled(data);
                            !!subscription && subscription.unsubscribe();
                            didFinish = true;
                        }
                    });
                    if (didFinish)
                        !!subscription && subscription.unsubscribe();
                });
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
        if (!object)
            return false;
        const objectKeys = getObjectKeys(object);
        return keys.every(key => objectKeys.indexOf(key) >= 0);
    }
    /**
     * Wrap a module name to mark it as wrapped.
     * @param moduleName The original module name.
     * @return The wrapped module name.
     */
    function wrapModuleName(moduleName) {
        return `Wrapped${moduleName}`;
    }

    (function (StreamEvent) {
        StreamEvent["STREAM_TERMINATED"] = "STREAM_TERMINATED";
    })(exports.StreamEvent || (exports.StreamEvent = {}));
    /**
     * Convert the callback to a stream to receive continual values.
     * @param globalObject The global object - generally window.
     * @param param1 Parameters for stream creation.
     * @return A stream that can be subscribed to.
     */
    function streamCallback(globalObject, { callbackNameFunc, funcToWrap }) {
        return createDataStream((handlers) => {
            /** Generate callback name dynamically to make this stream idempotent. */
            const callbackName = callbackNameFunc();
            let subscription;
            globalObject[callbackName] = (data) => {
                if (isType(data, 'status_code')) {
                    if (isType(data.result, 'event')) {
                        switch (data.result.event) {
                            case exports.StreamEvent.STREAM_TERMINATED:
                                subscription.unsubscribe();
                                break;
                        }
                    }
                    else {
                        handlers && handlers.next && handlers.next(data);
                    }
                }
            };
            funcToWrap(callbackName);
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
        });
    }
    /**
     * Handle the simplication of callbacks for both single asynchronous return
     * values and streams.
     * @param globalObject The global object - generally window.
     * @param param1 Parameters for callback simplification.
     * @return Check the return types for private functions in this module.
     */
    function simplifyCallback(globalObject, _a) {
        var restParams = __rest(_a, ["funcNameToWrap"]);
        return streamCallback(globalObject, restParams);
    }

    /**
     * Wrap a generic module. This should work for both Android and iOS-injected
     * Javascript interfaces.
     * @param globalObject The global object - generally window.
     * @param moduleName The name of the module that owns the method.
     * @param moduleMethodFunc Function to execute the related module method.
     * @return The wrapped module.
     */
    function wrapGenericModule(globalObject, moduleName, moduleMethodFunc) {
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
                    funcToWrap: callback => moduleMethodFunc({
                        callback,
                        method,
                        parameters: params !== undefined && params !== null ? params : {}
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
        globalObject[wrapModuleName(moduleName)] = wrapGenericModule(globalObject, moduleName, params => {
            if (!!globalObject[moduleName]) {
                globalObject[moduleName][params.method](JSON.stringify(params));
            }
            else if (!!globalObject.webkit &&
                !!globalObject.webkit.messageHandlers &&
                !!globalObject.webkit.messageHandlers[moduleName]) {
                globalObject.webkit.messageHandlers[moduleName].postMessage(params);
            }
        });
    }

    exports.wrapModule = wrapModule;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
