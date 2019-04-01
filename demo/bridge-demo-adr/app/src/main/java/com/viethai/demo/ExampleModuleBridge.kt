package com.viethai.demo

import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson

/** Created by viethai.pham on 31/3/19 */
@SuppressLint("NewApi")
class ExampleModuleBridge(private val webView: WebView,
                          private val module: ExampleModule,
                          private val gson: Gson) {
  class Request(val method: String, val parameters: Map<String, Any>, val callback: String)
  class Response(val result: Any?, val error: Any?, val status_code: Int)
  class StreamEvent(val event: String)

  private fun sendResponse(request: Request, response: Any) {
    val responseString = this.gson.toJson(response)

    this.webView.post {
      val javascript = "javascript:${request.callback}($responseString)"
      this@ExampleModuleBridge.webView.evaluateJavascript(javascript) {}
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

    this.module.observeValue(key) { _, v, state ->
      when (state) {
        ExampleModule.StreamState.ACTIVE ->
          this.sendResponse(request, Response(v, null, 200))

        ExampleModule.StreamState.COMPLETED ->
          this.sendResponse(request, StreamEvent("STREAM_TERMINATED"))
      }
    }
  }

  @JavascriptInterface
  fun unsubscribeFromObserver(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    val key = request.parameters["key"] as String
    this.module.unsubscribeFromObserver(key)
    this.sendResponse(request, Response(null, null, 200))
  }
}
