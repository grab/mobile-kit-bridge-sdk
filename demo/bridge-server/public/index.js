!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?n(exports):"function"==typeof define&&define.amd?define(["exports"],n):n((e=e||self).bridgeSDK={})}(this,function(c){"use strict";function i(e){for(var n=[],t=1;t<arguments.length;t++)n[t-1]=arguments[t];if(!e)return!1;var r=function(e){return Object.keys(e).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(e)))}(e);return n.every(function(e){return 0<=r.indexOf(e)})}function t(r,e){var u=e.callbackNameFunc,o=e.funcToWrap;return function(e){return{subscribe:e,then:function(r,u){return new Promise(function(){try{var n=null,t=!1;n=e({next:function(e){r&&r(e),n&&n.unsubscribe(),t=!0}}),t&&n&&n.unsubscribe()}catch(e){u&&u(e)}})}}}(function(n){var t,e=u();return r[e]=function(e){if(i(e,"status_code"))if(i(e.result,"event"))switch(e.result.event){case c.StreamEvent.STREAM_TERMINATED:t.unsubscribe()}else n&&n.next&&n.next(e)},o(e),t=function(e){var n=!1;return{isUnsubscribed:function(){return n},unsubscribe:function(){n||(e(),n=!0)}}}(function(){delete r[e],n&&n.complete&&n.complete()})})}function f(e,n){n.funcNameToWrap;return t(e,function(e,n){var t={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&n.indexOf(r)<0&&(t[r]=e[r]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var u=0;for(r=Object.getOwnPropertySymbols(e);u<r.length;u++)n.indexOf(r[u])<0&&(t[r[u]]=e[r[u]])}return t}(n,["funcNameToWrap"]))}(c.StreamEvent||(c.StreamEvent={})).STREAM_TERMINATED="STREAM_TERMINATED",c.wrapModule=function(n,t){n[function(e){return"Wrapped"+e}(t)]=function(e,r,u){var o={};return{invoke:function(n,t){return f(e,{funcNameToWrap:n,callbackNameFunc:function(){var e=o[n]||0;return o[n]=e+1,function(e){var n=e.moduleName,t=e.funcName,r=e.requestID;return n+"_"+t+"Callback"+(null!==r?"_"+r:"")}({moduleName:r,requestID:e,funcName:n})},funcToWrap:function(e){return u({callback:e,method:n,parameters:null!=t?t:{}})}})}}}(n,t,function(e){if(n[t])n[t][e.method](JSON.stringify(e));else{if(!(n.webkit&&n.webkit.messageHandlers&&n.webkit.messageHandlers[t]))throw new Error("Unexpected method '"+e.method+"' for module '"+t+"'");n.webkit.messageHandlers[t].postMessage(e)}})},Object.defineProperty(c,"__esModule",{value:!0})});
