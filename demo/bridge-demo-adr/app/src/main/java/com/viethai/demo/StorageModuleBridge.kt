package com.viethai.demo

import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import io.reactivex.disposables.Disposable
import io.reactivex.disposables.Disposables

/** Created by viethai.pham on 31/3/19 */
@SuppressLint("NewApi")
class StorageModuleBridge(private val webView: WebView,
                          private val module: StorageModule,
                          private val gson: Gson) {
  data class Request(val method: String, val parameters: Map<String, Any>, val callback: String)
  data class Response(val result: Any?, val error: Any?, val status_code: Int)

  private fun isCallbackAvailable(callback: String, cb: (Boolean) -> Unit) {
    val javascript = "javascript:!!window.$callback"

    this.webView.post {
      this@StorageModuleBridge.webView.evaluateJavascript(javascript) { cb(it == "true") }
    }
  }

  private fun sendResponse(request: Request, response: Any) {
    val responseString = this.gson.toJson(response)

    this.webView.post {
      val javascript = "javascript:${request.callback}($responseString)"
      this@StorageModuleBridge.webView.evaluateJavascript(javascript) {}
    }
  }

  @JavascriptInterface
  fun setValue(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    val key = request.parameters["key"] as String
    val value = request.parameters["value"]
    this.module.setValue(key, value)
    this.sendResponse(request, Response(null, null, 200))
  }

  @JavascriptInterface
  fun getValue(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    val key = request.parameters["key"] as String
    val value = this.module.getValue(key)
    this.sendResponse(request, Response(value, null, 200))
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
