//
//  StorageModuleBridge.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 1/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation
import RxSwift
import WebKit

final class StorageModuleBridge: BaseModuleBridge {
  private let module: StorageModule
  
  init(module: StorageModule, delegate: BridgeDelegate) {
    self.module = module
    super.init(delegate)
  }
}

extension StorageModuleBridge: WKScriptMessageHandler {
  func userContentController(_ userContentController: WKUserContentController,
                             didReceive message: WKScriptMessage) {
    let params = message.body as! [String : Any]
    let method = params["method"] as! String
    let parameters = params["parameters"] as! [String : Any]
    let callback = params["callback"] as! String
    
    switch method {
    case "setValue":
      let key = parameters["key"] as! String
      let value = parameters["value"]
      let response = CallbackResponse(result: nil, error: nil, status_code: 200)
      self.module.setValue(key: key, value: value)
      self.sendResult(response: response, callback: callback)
      
    case "observeValue":
      let key = parameters["key"] as! String
      var disposable = Disposables.create()
      
      disposable = self.module.observeValue(key: key) { [weak self] value in
        guard let this = self else { disposable.dispose(); return }
        
        this.isCallbackAvailable(callback: callback) {
          if $0 {
            let response = CallbackResponse(result: value, error: nil, status_code: 200)
            this.sendResult(response: response, callback: callback)
          } else {
            disposable.dispose()
          }
        }
      }.subscribe()
      
    default:
      break
    }
  }
}
