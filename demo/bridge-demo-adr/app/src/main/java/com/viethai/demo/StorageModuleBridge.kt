package com.viethai.demo

import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import io.reactivex.disposables.Disposable
import io.reactivex.disposables.Disposables

/** Created by viethai.pham on 31/3/19 */
@SuppressLint("NewApi")
class StorageModuleBridge(webView: WebView, private val module: StorageModule, gson: Gson) :
  BaseModuleBridge(webView, gson) {
  @JavascriptInterface
  fun setValue(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    val key = request.parameters["key"] as String
    val value = request.parameters["value"]
    this.module.setValue(key, value)
    this.sendResponse(request, BaseModuleBridge.Response(null, null, 200))
  }

  @JavascriptInterface
  fun getValue(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    val key = request.parameters["key"] as String
    val value = this.module.getValue(key)
    this.sendResponse(request, BaseModuleBridge.Response(value, null, 200))
  }

  @JavascriptInterface
  fun observeValue(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    val key = request.parameters["key"] as String
    var disposable: Disposable = Disposables.fromAction {  }

    disposable = this.module.observeValue(key) { v ->
      this@StorageModuleBridge.isCallbackAvailable(request.callback) {
        if (it) {
          this.sendResponse(request, Response(v, null, 200))
        } else {
          disposable.dispose()
        }
      }
    }.subscribe()
  }
}
