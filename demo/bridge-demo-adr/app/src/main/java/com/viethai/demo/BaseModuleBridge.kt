package com.viethai.demo

import android.annotation.SuppressLint
import android.webkit.WebView
import com.google.gson.Gson
import io.reactivex.Flowable
import io.reactivex.disposables.Disposables
import io.reactivex.schedulers.Schedulers
import java.util.concurrent.CountDownLatch

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

  @SuppressLint("NewApi")
  protected fun sendResponse(request: Request, response: Any, cb: (() -> Unit)? = null) {
    val responseString = this.gson.toJson(response)

    this.webView.post {
      val javascript = "javascript:${request.callback}($responseString)"
      this@BaseModuleBridge.webView.evaluateJavascript(javascript) {}
      cb?.invoke()
    }
  }

  private fun isCallbackAvailableSync(callback: String): Boolean {
    val latch = CountDownLatch(1)
    var result = false
    this.isCallbackAvailable(callback) { result = it; latch.countDown() }
    latch.await()
    return result
  }

  private fun sendResponseSync(request: Request, response: Any) {
    val latch = CountDownLatch(1)
    this.sendResponse(request, response) { latch.countDown() }
    latch.await()
  }

  protected fun <T> sendStreamResponse(request: Request, stream: Flowable<T>) {
    var disposable = Disposables.fromAction {  }

    disposable = stream
      .observeOn(Schedulers.computation())
      .subscribe({
        if (this@BaseModuleBridge.isCallbackAvailableSync(request.callback)) {
          val response = Response(it, null, 200)
          this@BaseModuleBridge.sendResponseSync(request, response)
        } else {
          disposable.dispose()
        }
      }, {}, {
        val response = BaseModuleBridge.Response(BaseModuleBridge.StreamEvent.Complete, null, 200)
        this@BaseModuleBridge.sendResponse(request, response)
      })
  }
}
