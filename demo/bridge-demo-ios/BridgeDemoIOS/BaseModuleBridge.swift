//
//  BaseModuleBridge.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 5/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation
import RxSwift

protocol ResponseType {
  func toDictionary() -> [String : Any?]
}

public protocol BridgeDelegate: class {
  func evaluateJavaScript(_ javascript: String, completionHandler: ((Any?, Error?) -> Void)?)
}

public class BaseModuleBridge: NSObject {
  public enum StreamEvent: ResponseType {
    case completed
    
    public func toDictionary() -> [String : Any?] {
      switch self {
      case .completed: return ["event" : "STREAM_TERMINATED"]
      }
    }
  }
  
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
  let disposeBag: DisposeBag
  
  public init(_ delegate: BridgeDelegate) {
    self.delegate = delegate
    self.disposeBag = DisposeBag()
  }
  
  func isCallbackAvailable(callback: String, cb: @escaping (Bool) -> Void) {
    let javascript = "!!window.\(callback)"
    
    self.delegate?.evaluateJavaScript(javascript) {result, error in
      cb((result as? Int).map({$0 == 1}) ?? false)
    }
  }
  
  func isCallbackAvailableSync(callback: String) -> Bool {
    let dispatchGroup = DispatchGroup()
    var result = false
    dispatchGroup.enter()
    
    self.isCallbackAvailable(callback: callback, cb: {
      result = $0; dispatchGroup.leave()
    })
    
    dispatchGroup.wait()
    return result
  }
  
  func sendResult(response: ResponseType,
                  callback: String,
                  cb: ((Any?, Error?) -> Void)? = nil) {
    let dict = response.toDictionary()
    let data = try! JSONSerialization.data(withJSONObject: dict, options: .prettyPrinted)
    let responseString = String(data: data, encoding: .utf8)!
    let callbackString = "window.\(callback)(\(responseString))"
    self.delegate?.evaluateJavaScript(callbackString, completionHandler: cb)
  }
  
  func sendStreamResult<R>(stream: Observable<R>, callback: String)
    -> Disposable where R: ResponseType
  {
    var disposable = Disposables.create()
    
    let ifCallbackAvailable: (BaseModuleBridge, () -> Void) -> Void = {
      if ($0.isCallbackAvailableSync(callback: callback)) {
        $1()
      } else {
        disposable.dispose()
      }
    }
    
    disposable = stream
      .observeOn(ConcurrentDispatchQueueScheduler(qos: .background))
      .subscribe(
        onNext: {[weak self] (data: ResponseType) in
          guard let this = self else { return }
          
          ifCallbackAvailable(this) {
            let dict = data.toDictionary()
            let response = CallbackResponse(result: dict, error: nil, status_code: 200)
            _ = this.sendResult(response: response, callback: callback)
          }
        },
        onError: {[weak self] error in
          guard let this = self else { return }
          
          ifCallbackAvailable(this) {
            let response = CallbackResponse(result: nil, error: error, status_code: 404)
            _ = this.sendResult(response: response, callback: callback)
          }
        },
        onCompleted: {[weak self] in
          guard let this = self else { return }
          let eventResult = StreamEvent.completed.toDictionary()
          let response = CallbackResponse(result: eventResult, error: nil, status_code: 200)
          _ = this.sendResult(response: response, callback: callback)
        },
        onDisposed: {}
      )
    
    return disposable
  }
}
