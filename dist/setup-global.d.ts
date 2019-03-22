/**
 * Set up global callback to handle multiple request IDs.
 * @param globalObject The global object - generally window.
 * @param param1 The required parameters.
 */
export default function (globalObject: any, { callbackNameFunc }: Readonly<{
    /** Get the name of the relevant callback. */
    callbackNameFunc: (requestID: number | string | null) => string;
}>): void;
