import { WrappedMethodParameter } from './common';
/**
 * Get the keys of a module.
 * @param module The module being wrapped.
 * @return Array of module keys.
 */
export declare function getModuleKeys<Module>(module: Module): string[];
/**
 * Check if a function returns a stream.
 * @param funcName The name of the function.
 */
export declare function isStreamFunction(funcName: string): boolean;
/**
 * Get the callback name that will be used to access global callback.
 * @param param0 The required parameters.
 * @return The combined callback name.
 */
export declare function getCallbackName({ moduleName, funcName, requestID: req }: Readonly<{
    /** The name of the module that owns the method. */
    moduleName: string;
    /** The name of the method being wrapped. */
    funcName: string;
    /** The request ID of the callback. */
    requestID: number | string | null;
}>): string;
/**
 * Create a parameter object to work with both Android and iOS module wrappers.
 * @param paramName The parameter name.
 * @param paramValue The parameter value.
 * @return A Parameter object.
 */
export declare function createMethodParameter(paramName: WrappedMethodParameter['paramName'], paramValue: WrappedMethodParameter['paramValue']): WrappedMethodParameter;
