# mobile-kit-bridge-sdk

SDK for mobile kit bridge to offer unified method signatures for Android/iOS.

For example:

```javascript
const identifier = await window.LocaleKit.invoke('getLocaleIdentifier');

await window.AnalyticsModule.invoke(
  'track',
  createKitMethodParameter('analyticsEvent', event),
)

await window.MediaKit.invoke(
  'playDRMContent',
  createKitMethodParameter('contentURL', contentURL),
  createKitMethodParameter('license', license),
  ...
)
```

For the sake of standardization, **all** kit methods must invoke the relevant callback after they finish, even if they run synchronously or do not have anything meaningful to return:

```kotlin
webView.evaluateJavascript("window.MediaKit_playDRMContentCallback()") { _ -> }
```

```swift
webView.evaluateJavascript("window.MediaKit_playDRMContentCallback()", nil)
```

The name of the callback is always:

```javascript
[kitName]_[functionName]Callback
```

For e.g.:

```javascript
AnalyticsModule.track -> AnalyticsModule_trackCallback
MediaKit.playDRMContent -> MediaKit_playDRMContentCallback
```

This callback style allows us to pass errors to the partner app that they can handle in case something goes wrong. The errors, if any, should be in a predefined format.
