import { StringKeys } from './utils';
/** Android method parameters  */
export declare type AndroidMethodParameter<Params> = Readonly<{
    /** The method name. */
    method: string;
    /** The method parameters. */
    parameters: Params;
    /** The name of the callback. */
    callback: string;
}>;
/** Represents an Android module. */
declare type AndroidModule = Readonly<{
    [K: string]: (params: AndroidMethodParameter<any>) => unknown;
}>;
/**
 * Represents a wrapped Android module. Each method in the original module is
 * mapped to a method key along with its actual parameters.
 */
declare type WrappedAndroidModule<Original extends AndroidModule> = Readonly<{
    invoke: <MethodKey extends StringKeys<Original>>(method: MethodKey, params: Parameters<Original[MethodKey]>[0]['parameters']) => unknown;
}>;
/**
 * Wrap an Android module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObj The Android module being wrapped.
 * @return The wrapped module.
 */
export declare function wrapAndroidModule<Module extends AndroidModule>(globalObject: any, moduleName: string, moduleObj: Module): WrappedAndroidModule<Module>;
export {};
