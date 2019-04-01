export declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export declare type StringKeys<T> = Extract<keyof T, string>;
/** Method parameters for native methods. */
export declare type NativeParameter<MethodKey, Params> = Readonly<{
    /** The method name. */
    method: MethodKey;
    /** The method parameters. */
    parameters: Params;
    /** The name of the callback. */
    callback: string;
}>;
export declare type CallbackResult = Readonly<{
    /** The result of the operation. */
    result: unknown;
    /** The error object, if any. */
    error: unknown;
    /** The status code. */
    status_code: number;
}>;
/**
 * Get the keys of an object.
 * @param object Some object.
 * @return Array of object keys.
 */
export declare function getObjectKeys<T>(object: T): string[];
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
 * Check if an object is of a certain type.
 * @param object Some object.
 * @return Whether the object is of this type.
 */
export declare function isType<T, K extends StringKeys<T> = StringKeys<T>>(object: unknown, ...keys: K[]): object is T;
