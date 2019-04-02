# mobile-kit-bridge-sdk

SDK for mobile module bridge to offer unified method signatures for Android/iOS.

## Asynchronous returns

For example:

```javascript
const identifier = await window.LocaleKit.invoke('getLocaleIdentifier');
await window.AnalyticsModule.invoke('track', { analyticsEvent: event })
await window.MediaKit.invoke('playDRMContent', { contentURL, license })
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
AnalyticsModule.track -> AnalyticsModule_trackCallback
MediaKit.playDRMContent -> MediaKit_playDRMContentCallback
```

This callback style allows us to pass errors to the partner app that they can handle in case something goes wrong.

## Value streaming

All module methods whose parameters include a flag `isStream: true` are assumed to support streaming, e.g.:

```javascript
const subscription = window.MediaKit.invoke('observePlayDRMContent', { isStream: true, ... }).subscribe({
  next: console.log,
  complete: console.log,
});
```

Calling these methods returns `DataStream` objects that can be subscribed to with `StreamHandlers` (i.e. `onValue`, `onComplete` etc.). Once `subscribe` is called, a `Subscription` object is created to control when streaming should be terminated.

Note that `DataStream` always creates new streams whenever `subscribe` is called, so there is no need to worry about invoking it multiple times. The concept of `DataStream` is similar to that of an `Observable`, and it certainly is easy to bridge the two:

```javascript
const playObservable = new Observable(sub => {
  const subscription = window.MediaKit.invoke('observePlayDRMContent', { isStream: true, ... }).subscribe({ 
    next: data => sub.next(data),
    complete: () => sub.complete(),
  });

  return () => subscription.unsubscribe();
});

playObservable.pipe(filter(...), map(...)).subscribe(...);
```

`DataStream` also supports `Promise`-style chaining and `async-await`. Instead of getting values over time, this will simply deliver the first value that arrives:

```javascript
const { result, error, status_code } = await window.MediaKit.invoke('observePlayDRMContent', { isStream: true, ... });
```

## Data format

Callback results must be in the format prescribed below:

```javascript
type CallbackResult = Readonly<{
  /** The result of the operation. */
  result: unknown;

  /** The error object, if any. */
  error: unknown;

  /** The status code. */
  status_code: number;
}>;
```

Make sure native code is passing data in the correct format, or else callbacks will not be invoked.
