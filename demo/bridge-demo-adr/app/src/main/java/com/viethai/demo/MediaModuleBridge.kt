package com.viethai.demo

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import io.reactivex.Completable
import io.reactivex.disposables.Disposables

/** Created by viethai.pham on 4/4/19 */
class MediaModuleBridge(webView: WebView, private val module: MediaModule, gson: Gson) :
  BaseModuleBridge(webView, gson) {

  @JavascriptInterface
  fun playVideo(requestString: String) {
    val request = this.gson.fromJson(requestString, Request::class.java)
    var disposable = Disposables.fromAction {  }

    disposable = this.module.playVideo()
      .concatMap { data ->
        this@MediaModuleBridge.isCallbackAvailableStream(request.callback)
          .flatMap {
            if (it) {
              val response = Response(data, null, 200)
              this@MediaModuleBridge.sendResponseStream(request, response)
            } else {
              Completable.fromAction { disposable.dispose() }.toFlowable()
            }
          }
      }
      .subscribe({}, {}, {
        val response = Response(StreamEvent.Complete, null, 200)
        this@MediaModuleBridge.sendResponse(request, response)
      })
  }
}
