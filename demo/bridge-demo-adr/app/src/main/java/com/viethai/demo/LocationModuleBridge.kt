package com.viethai.demo

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson

/** Created by viethai.pham on 2019-07-02 */
class LocationModuleBridge(webView: WebView, private val module: LocationModule, gson: Gson) :
  BaseModuleBridge(webView, gson) {

  @JavascriptInterface
  fun observeLocationChange(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    this.sendStreamResponse(request, this.module.observeLocationStream())
  }
}
