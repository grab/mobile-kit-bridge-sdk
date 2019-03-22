import { WrappedMethodParameter } from './common';
declare type StringKeys<T> = Extract<keyof T, string>;
/** Represents an Android module. */
declare type AndroidModule = Readonly<{
    [K: string]: (...params: any[]) => unknown;
}>;
/**
 * Represents a wrapped Android module. Each method in the original module is
 * mapped to a method key along with its actual parameters.
 */
declare type WrappedAndroidModule<Original extends AndroidModule> = Readonly<{
    invoke: <MethodKey extends StringKeys<Original>>(method: MethodKey, ...params: WrappedMethodParameter[]) => PromiseLike<ReturnType<Original[MethodKey]>>;
}>;
/** Represents an iOS module. */
declare type IOSModule<MethodKeys extends string> = Readonly<{
    postMessage: (params: IOSMethodParameter<MethodKeys>) => unknown;
}>;
/** Represents a wrapped IOS module. */
declare type WrappedIOSModule<MethodKeys extends string> = Readonly<{
    invoke: <MethodKey extends MethodKeys>(method: MethodKey, ...params: WrappedMethodParameter[]) => PromiseLike<unknown>;
}>;
/** Method parameters for iOS. */
export declare type IOSMethodParameter<MethodKeys extends string> = Readonly<{
    /** The method name. */
    method: MethodKeys;
    /** The method parameters. */
    parameters: Readonly<{
        requestID: string | number;
        [K: string]: unknown;
    }>;
    /** The name of the callback. */
    callbackName: string;
}>;
/**
 * Wrap an Android module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObj The Android module being wrapped.
 * @return The wrapped module.
 */
export declare function wrapAndroidModule<Module extends AndroidModule>(globalObject: any, moduleName: string, moduleObj: Module): WrappedAndroidModule<Module>;
/**
 * Wrap an iOS module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObj The iOS module being wrapped.
 * @return The wrapped module.
 */
export declare function wrapIOSModule<MethodKeys extends string>(globalObject: any, moduleName: string, moduleObj: IOSModule<MethodKeys>): WrappedIOSModule<MethodKeys>;
/**
 * Wrap the appropriate module based on whether or not it's Android/iOS.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module being wrapped.
 */
export declare function wrapModule(globalObject: any, moduleName: string): void;
export {};