import { DefaultParameters, NativeParameter, StringKeys } from './utils';
/** Android method parameters  */
export declare type AndroidMethodParameter<Params = Readonly<{
    [K: string]: unknown;
}>> = NativeParameter<string, Params>;
/** Represents an Android module. */
declare type AndroidModule = Readonly<{
    [K: string]: (params: string) => unknown;
}>;
/**
 * Represents a wrapped Android module. Each method in the original module is
 * mapped to a method key along with its actual parameters.
 */
declare type WrappedAndroidModule<Original extends AndroidModule> = Readonly<{
    invoke: <MethodKey extends StringKeys<Original>>(method: MethodKey, params: Readonly<{
        [K: string]: unknown;
    }> & DefaultParameters) => unknown;
}>;
/**
 * Wrap an Android module.
 * @param globalObject The global object - generally window.
 * @param moduleName The name of the module that owns the method.
 * @param moduleObjFunc Function to get the current module object.
 * @return The wrapped module.
 */
export declare function wrapAndroidModule<Module extends AndroidModule>(globalObject: any, moduleName: string, moduleObjFunc: () => Module): WrappedAndroidModule<Module>;
export {};
