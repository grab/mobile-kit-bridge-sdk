# CHANGELOG

## v2.0.0

### Breaking changes

- Instead of using closure state to manage callback names, determinate the next available callback name for the global object itself. This prevents unexpected reusing of callback names (e.g. when web page is reloaded but mobile is not aware).

## v1.2.2

### Improvements

- Add value type to `DataStream`.

## v1.2.1

### Improvements

- Expose `createDataStream` and `createSubscription`.

## v1.2.0

### New features

- Get `getModuleEnvironment` to get a module's current mobile environment.

## v1.1.2

### Improvements

- Add type parameter to `CallbackResult`, so now it is `CallbackResult<T>`.

## v1.1.1

### Improvements

- Add `module` to `NativeParameters` so that native code can access the module name directly in the message payload.

## v1.0.0

### New features

First release of the SDK, with only one function that should be used:

`wrapModule(window, 'LocationModule')`

This call will inject an object called `WrappedLocationModule` into the global `window` object.
