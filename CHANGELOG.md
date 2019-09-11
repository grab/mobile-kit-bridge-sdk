# CHANGELOG

## v1.1.1

### Improvements

- Add `module` to `NativeParameters` so that native code can access the module name directly in the message payload.

## v1.0.0

### New features

First release of the SDK, with only one function that should be used:

`wrapModule(window, 'LocationModule')`

This call will inject an object called `WrappedLocationModule` into the global `window` object.
