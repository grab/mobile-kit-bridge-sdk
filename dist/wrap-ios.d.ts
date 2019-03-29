import { NativeParameter } from './utils';
/** Method parameters for iOS. */
export declare type IOSMethodParameter<MethodKey, Params = Readonly<{
    [K: string]: unknown;
}>> = NativeParameter<MethodKey, Params>;
/** Represents an iOS module. */
declare type IOSModule<MethodKeys extends string> = Readonly<{
    postMessage: (params: IOSMethodParameter<MethodKeys>) => unknown;
}>;
/** Represents a wrapped IOS module. */
declare type WrappedIOSModule<MethodKeys extends string> = Readonly<{
    invoke: <MethodKey extends MethodKeys>(method: MethodKey, params: IOSMethodParameter<MethodKeys>['parameters']) => unknown;
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
