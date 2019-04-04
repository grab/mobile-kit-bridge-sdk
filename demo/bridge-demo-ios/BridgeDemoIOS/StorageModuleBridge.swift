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

protocol StorageBridgeDelegate: class {
  func evaluateJavaScript(_ javascript: String, completionHandler: ((Any?, Error?) -> Void)?)
}

protocol ResponseType {
  func toDictionary() -> [String : Any?]
}

final class StorageModuleBridge: NSObject {
  private let module: StorageModule
  private weak var delegate: StorageBridgeDelegate?
  
  init(module: StorageModule, delegate: StorageBridgeDelegate) {
    self.module = module
    self.delegate = delegate
  }
  
  private func isCallbackAvailable(callback: String, cb: @escaping (Bool) -> Void) {
    let javascript = "!!window.\(callback)"
    
    self.delegate?.evaluateJavaScript(javascript) {result, error in
      cb((result as? Int).map({$0 == 1}) ?? false)
    }
  }
  
  private func sendResult(response: ResponseType, callback: String) {
    let dict = response.toDictionary()
    let data = try! JSONSerialization.data(withJSONObject: dict, options: .prettyPrinted)
    let responseString = String(data: data, encoding: .utf8)!
    let callbackString = "window.\(callback)(\(responseString))"
    self.delegate?.evaluateJavaScript(callbackString, completionHandler: nil)
  }
}

extension StorageModuleBridge: WKScriptMessageHandler {
  private struct CallbackResponse: ResponseType {
    let result: Any?
    let error: Any?
    let status_code: Int
    
    func toDictionary() -> [String : Any?] {
      return [
        "result": self.result,
        "error": self.error,
        "status_code": self.status_code
      ]
    }
  }
  
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
