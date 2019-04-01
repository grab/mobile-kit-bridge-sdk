//
//  ExampleModuleBridge.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 1/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation
import WebKit

protocol BridgeDelegate: class {
  func evaluateJavaScript(_ javascript: String, completionHandler: ((Any?, Error?) -> Void)?)
}

protocol ResponseType {
  func toDictionary() -> [String : Any?]
}

final class ExampleModuleBridge: NSObject {
  private let module: ExampleModule
  private weak var delegate: BridgeDelegate?
  
  init(module: ExampleModule, delegate: BridgeDelegate) {
    self.module = module
    self.delegate = delegate
  }
  
  private func sendResult(response: ResponseType, callback: String) {
    let dict = response.toDictionary()
    let data = try! JSONSerialization.data(withJSONObject: dict, options: .prettyPrinted)
    let responseString = String(data: data, encoding: .utf8)!
    let callbackString = "window.\(callback)(\(responseString))"
    self.delegate?.evaluateJavaScript(callbackString, completionHandler: nil)
  }
}

extension ExampleModuleBridge: WKScriptMessageHandler {
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
  
  private struct StreamEvent: ResponseType {
    let event: String
    
    func toDictionary() -> [String : Any?] {
      return ["event": self.event]
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
      
      self.module.observeValue(key: key) { [weak self] _, value, state in
        guard let this = self else { return }
        
        switch state {
        case .active:
          let response = CallbackResponse(result: value, error: nil, status_code: 200)
          this.sendResult(response: response, callback: callback)
          
        case .complete:
          let response = StreamEvent(event: "STREAM_TERMINATED")
          this.sendResult(response: response, callback: callback)
        }
      }
      
    case "unsubscribeFromObserver":
      let key = parameters["key"] as! String
      self.module.unsubscribeFromObserver(key: key)
      
    default:
      break
    }
  }
}
