package com.viethai.demo

import android.annotation.SuppressLint
import android.webkit.WebView
import com.google.gson.Gson
import io.reactivex.BackpressureStrategy
import io.reactivex.Flowable

/** Created by viethai.pham on 4/4/19 */
open class BaseModuleBridge(private val webView: WebView, protected val gson: Gson) {
  data class Request(val method: String, val parameters: Map<String, Any>, val callback: String)
  data class Response(val result: Any?, val error: Any?, val status_code: Int)

  sealed class StreamEvent(val event: String) {
    object Complete : StreamEvent("STREAM_TERMINATED")
  }

  @SuppressLint("NewApi")
  protected fun isCallbackAvailable(callback: String, cb: (Boolean) -> Unit) {
    val javascript = "javascript:!!window.$callback"

    this.webView.post {
      this@BaseModuleBridge.webView.evaluateJavascript(javascript) { cb(it == "true") }
    }
  }

  protected fun isCallbackAvailableStream(callback: String): Flowable<Boolean> {
    return Flowable.create({ emitter ->
      this@BaseModuleBridge.isCallbackAvailable(callback) {
        emitter.onNext(it); emitter.onComplete()
      }
    }, BackpressureStrategy.BUFFER)
  }

  @SuppressLint("NewApi")
  protected fun sendResponse(request: Request, response: Any, cb: (() -> Unit)? = null) {
    val responseString = this.gson.toJson(response)

    this.webView.post {
      val javascript = "javascript:${request.callback}($responseString)"
      this@BaseModuleBridge.webView.evaluateJavascript(javascript) {}
      cb?.invoke()
    }
  }

  protected fun sendResponseStream(request: Request, response: Any): Flowable<Unit> {
    return Flowable.create({ emitter ->
      this@BaseModuleBridge.sendResponse(request, response) {
        emitter.onNext(Unit); emitter.onComplete()
      }
    }, BackpressureStrategy.BUFFER)
  }
}
