package com.viethai.demo

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import kotlinx.android.synthetic.main.main_activity.*



class MainActivity : AppCompatActivity() {
  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.main_activity)
    val storeModule = StorageModule()
    val storageBridge = StorageModuleBridge(this.web_view, storeModule, Gson())
    val mediaModule = MediaModule()
    val mediaBridge = MediaModuleBridge(this.web_view, mediaModule, Gson())
    var currentPath = 0
    val buildURL: () -> String = {"http://10.0.2.2:8000/$currentPath"}

    val webClient = object : WebViewClient() {
      override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        this@MainActivity.web_url.text = url
      }
    }

    this.web_view.apply {
      this.webViewClient = webClient;
      this.settings.apply { this.javaScriptEnabled = true }
      this.addJavascriptInterface(storageBridge, "StorageModule")
      this.addJavascriptInterface(mediaBridge, "MediaModule")
      this.loadUrl(buildURL())
    }

    this.reload_page.setOnClickListener {
      currentPath += 1
      this@MainActivity.web_view.loadUrl(buildURL())
    }
  }

  override fun onPause() {
    super.onPause()
    this.web_view.onPause()
  }

  override fun onResume() {
    super.onResume()
    this.web_view.onResume()
  }
}
