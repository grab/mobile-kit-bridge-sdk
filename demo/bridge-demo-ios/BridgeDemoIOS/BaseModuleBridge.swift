//
//  BaseModuleBridge.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 5/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation

public protocol BridgeDelegate: class {
  func evaluateJavaScript(_ javascript: String, completionHandler: ((Any?, Error?) -> Void)?)
}

public class BaseModuleBridge: NSObject {
  public struct CallbackResponse: ResponseType {
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
  
  private weak var delegate: BridgeDelegate?
  
  public init(_ delegate: BridgeDelegate) {
    self.delegate = delegate
  }
  
  func isCallbackAvailable(callback: String, cb: @escaping (Bool) -> Void) {
    let javascript = "!!window.\(callback)"
    
    self.delegate?.evaluateJavaScript(javascript) {result, error in
      cb((result as? Int).map({$0 == 1}) ?? false)
    }
  }
  
  func sendResult(response: ResponseType, callback: String) {
    let dict = response.toDictionary()
    let data = try! JSONSerialization.data(withJSONObject: dict, options: .prettyPrinted)
    let responseString = String(data: data, encoding: .utf8)!
    let callbackString = "window.\(callback)(\(responseString))"
    self.delegate?.evaluateJavaScript(callbackString, completionHandler: nil)
  }
}
