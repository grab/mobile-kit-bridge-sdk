import { DataStream } from './subscription';
declare type Params = Readonly<{
    /** The name of the function to be wrapped. */
    funcNameToWrap: string;
    /** The method being wrapped. */
    funcToWrap: (callbackName: string) => unknown;
    /** Function to create the name of the callback that will receive results. */
    callbackNameFunc: () => string;
}>;
/**
 * Represents stream events that be used to communicate state of the stream
 * from native to web.
 */
export declare enum StreamEvent {
    STREAM_TERMINATED = "STREAM_TERMINATED"
}
/**
 * Represents an event result, which is a possible object that can be returned
 * in place of the callback result.
 */
export declare type StreamEventResult = Readonly<{
    event: StreamEvent;
}>;
/**
 * Handle the simplication of callbacks for both single asynchronous return
 * values and streams.
 * @param globalObject The global object - generally window.
 * @param param1 Parameters for callback simplification.
 * @return Check the return types for private functions in this module.
 */
export declare function simplifyCallback(globalObject: any, { funcNameToWrap, ...restParams }: Params): DataStream;
export {};
