//
//  WebViewController.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 1/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import UIKit
import WebKit

class WebViewController: UIViewController {
  override func loadView() {
    super.loadView()
    let locationModule = LocationModule()
    let locationBridge = LocationModuleBridge(module: locationModule, delegate: self)
    let mediaModule = MediaModule()
    let mediaBridge = MediaModuleBridge(module: mediaModule, delegate: self)
    let storageModule = StorageModule()
    let storageBridge = StorageModuleBridge(module: storageModule, delegate: self)
    let contentController = WKUserContentController()
    let config = WKWebViewConfiguration()
    contentController.add(locationBridge, name: "LocationModule")
    contentController.add(mediaBridge, name: "MediaModule")
    contentController.add(storageBridge, name: "StorageModule")
    config.userContentController = contentController
    
    let webView = WKWebView(frame: self.view!.bounds, configuration: config)
    self.view!.addSubview(webView)
    
    // Load local web page.
    let url = URL(string: "http://127.0.0.1:8000")!
    let request = URLRequest(url: url)
    webView.load(request)
  }
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    self.navigationItem.rightBarButtonItem = UIBarButtonItem(
      title: "Reload",
      style: .done,
      target: self,
      action: #selector(self.reloadWebView(_:)))
  }
  
  @objc func reloadWebView(_ sender: UIBarButtonItem) {
    self.view!.subviews.compactMap({$0 as? WKWebView}).forEach({_ = $0.reload()})
  }
}

extension WebViewController: BridgeDelegate {
  func evaluateJavaScript(_ javascript: String, completionHandler: ((Any?, Error?) -> Void)?) {
    DispatchQueue.main.async {
      (self.view!.subviews.first(where: {$0 is WKWebView}) as! WKWebView)
        .evaluateJavaScript(javascript, completionHandler: completionHandler)
    }
  }
}
