export type CallbackResult = Readonly<{
  /** The result of the operation. */
  result: unknown;

  /** The error object, if any. */
  error: unknown;

  /** The status code. */
  status_code: number;
}>;

/** Method parameters for cross-platform usage. */
type WrappedMethodParameter = Readonly<{
  /** The name of the parameter. */
  paramName: string;

  /** The parameter value. */
  paramValue: unknown;
}>;
