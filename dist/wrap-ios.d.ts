import { WrappedMethodParameter } from './utils';
/** Represents an iOS module. */
declare type IOSModule<MethodKeys extends string> = Readonly<{
    postMessage: (params: IOSMethodParameter<MethodKeys>) => unknown;
}>;
/** Represents a wrapped IOS module. */
declare type WrappedIOSModule<MethodKeys extends string> = Readonly<{
    invoke: <MethodKey extends MethodKeys>(method: MethodKey, ...params: WrappedMethodParameter[]) => unknown;
}>;
/** Method parameters for iOS. */
export declare type IOSMethodParameter<MethodKeys extends string> = Readonly<{
    /** The method name. */
    method: MethodKeys;
    /** The method parameters. */
    parameters: Readonly<{
        [K: string]: unknown;
    }>;
    /** The name of the callback. */
    callbackName: string;
}>;
/**
 * Wrap an iOS module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObj The iOS module being wrapped.
 * @return The wrapped module.
 */
export declare function wrapIOSModule<MethodKeys extends string>(globalObject: any, moduleName: string, moduleObj: IOSModule<MethodKeys>): WrappedIOSModule<MethodKeys>;
export {};
