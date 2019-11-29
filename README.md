# Disclaimer

This SDK is a generic SDK for native webviews. For Grab `SuperApp` integration, please use the [SuperApp SDK](https://github.com/grab/superapp-sdk).

# mobile-kit-bridge-sdk

SDK for mobile module bridge to offer unified method signatures for Android/iOS.

## Asynchronous returns

For example:

```javascript
const identifier = await window.WrappedLocaleKit.invoke("getLocaleIdentifier");
await window.WrappedAnalyticsModule.invoke("track", { analyticsEvent: event });
await window.WrappedMediaKit.invoke("playDRMContent", { contentURL, license });
```

All module methods will have `callback` as one of the parameters:

```java
class AnalyticsModuleBridge {
  fun track(requestString: String) {
    val request = Gson().fromJson(...)
    val callback = request.callback
    ...
  }
}
```

```swift
final class AnalyticsModuleBridge: WKScriptMessageHandler {
  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage) {
    let request = message.body as! [String : Any]
    let callback = request["callback"] as! String
    ...
  }
}
```

For the sake of standardization, **all** module methods must invoke the relevant callback after they finish, even if they run synchronously or do not have anything meaningful to return. Use the parameter `callback` to identify the correct callback to invoke:

```java
webView.evaluateJavascript("javascript:window.$callback(...)") { _ -> }
```

```swift
webView.evaluateJavascript("window.\(callback)(...)", nil)
```

The name of the callback always starts with:

```javascript
[moduleName]_[functionName]Callback
```

For e.g.:

```javascript
AnalyticsModule.track -> WrappedAnalyticsModule_trackCallback
MediaKit.playDRMContent -> WrappedMediaKit_playDRMContentCallback
```

This callback style allows us to pass errors to the partner app that they can handle in case something goes wrong.

## Value streaming

All module methods return streams, e.g.:

```javascript
/** Get stream of location updates. */
const subscription = window.WrappedLocationModule.invoke(
  "observeLocationChange"
).subscribe({ next: console.log, complete: console.log });
```

Calling these methods returns `DataStream` objects that can be subscribed to with `StreamHandlers` (i.e. `onValue`, `onComplete` etc.). Once `subscribe` is called, a `Subscription` object is created to control when streaming should be terminated.

Note that `DataStream` always creates new streams whenever `subscribe` is called, so there is no need to worry about invoking it multiple times. The concept of `DataStream` is similar to that of an `Observable`, and it is easy to bridge the two:

```javascript
const playObservable = new Observable(sub => {
  const subscription = window.WrappedMediaKit.invoke('observePlayDRMContent', { isStream: true, ... }).subscribe({
    next: data => sub.next(data),
    complete: () => sub.complete(),
  });

  return () => subscription.unsubscribe();
});

playObservable.pipe(filter(...), map(...)).subscribe(...);
```

`DataStream` also supports `Promise`-style chaining and `async-await`. Instead of getting values over time, this will simply deliver the first value that arrives:

```javascript
const { result, error, status_code } = await window.WrappedMediaKit.invoke('observePlayDRMContent', { isStream: true, ... });
```

Please be aware that **Promises returned by bridged methods are non-eager**, so they will only be triggered on invocation of `then`, or after an `await` in an `async` function.

## Data format

Callback results must be in the format prescribed below:

```javascript
type CallbackResult<T = unknown> = Readonly<{
  /** The result of the operation. */
  result: T,

  /** The error object, if any. */
  error: unknown,

  /** The status code. */
  status_code: number
}>;
```

Make sure native code is passing data in the correct format, or else callbacks will not be invoked.
