//
//  MediaModuleBridge.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 5/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import WebKit

public final class MediaModuleBridge: BaseModuleBridge {
  private let module: MediaModule
  
  public init(module: MediaModule, delegate: BridgeDelegate) {
    self.module = module
    super.init(delegate)
  }
}

extension MediaModuleBridge: WKScriptMessageHandler {
  public func userContentController(_ userContentController: WKUserContentController,
                                    didReceive message: WKScriptMessage) {
    let params = message.body as! [String : Any]
    let method = params["method"] as! String
    let callback = params["callback"] as! String
    
    switch method {
    case "playVideo":
      let videoStream = self.module.playVideo()
      
      self.sendStreamResult(stream: videoStream, callback: callback)
        .disposed(by: self.disposeBag)
      
    default:
      break
    }
  }
}
