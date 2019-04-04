package com.viethai.demo

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson

/** Created by viethai.pham on 4/4/19 */
class MediaModuleBridge(webView: WebView, private val module: MediaModule, gson: Gson) :
  BaseModuleBridge(webView, gson) {

  @JavascriptInterface
  fun playVideo(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    this.sendStreamResponse(request, this.module.playVideo())
  }
}
