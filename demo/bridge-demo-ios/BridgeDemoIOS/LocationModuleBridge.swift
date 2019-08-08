//
//  LocationModuleBridge.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 2/7/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import WebKit

public final class LocationModuleBridge: BaseModuleBridge {
  private let module: LocationModule
  
  public init(module: LocationModule, delegate: BridgeDelegate) {
    self.module = module
    super.init(delegate)
  }
}

extension LocationModuleBridge: WKScriptMessageHandler {
  public func userContentController(_ userContentController: WKUserContentController,
                                    didReceive message: WKScriptMessage) {
    let params = message.body as! [String : Any]
    let method = params["method"] as! String
    let callback = params["callback"] as! String
    
    switch method {
    case "observeLocationChange":
      let locationStream = self.module.observeLocationChange()
      
      self.sendStreamResult(stream: locationStream, callback: callback)
        .disposed(by: self.disposeBag)
      
    default:
      break
    }
  }
}
