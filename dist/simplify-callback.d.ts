declare type Params = Readonly<{
    /** The method being wrapped. */
    funcToWrap: Function;
    /** The name of the callback that will receive the results. */
    callbackName: string;
}>;
/**
 * Handle the simplication of callbacks for both single asynchronous return
 * values and streams.
 * @param globalObject The global object - generally window.
 * @param params Parameters for callback simplification.
 * @return Check the return types for private functions in this module.
 */
export default function (globalObject: any, params: Params): PromiseLike<any>;
export {};
