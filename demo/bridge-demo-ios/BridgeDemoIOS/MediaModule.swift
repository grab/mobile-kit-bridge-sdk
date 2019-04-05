//
//  MediaModule.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 5/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation
import RxSwift

public final class MediaModule {
  public enum PlayEvent: ResponseType {
    case startVideo
    case stopVideo
    case elapsedTime(Int, Int)
    
    private var type: String {
      switch self {
      case .startVideo: return "START_VIDEO"
      case .stopVideo: return "STOP_VIDEO"
      case .elapsedTime: return "ELAPSED_TIME"
      }
    }
    
    public func toDictionary() -> [String : Any?] {
      var dict: [String : Any] = ["type" : self.type]
      
      switch self {
      case .elapsedTime(let elapsed, let total):
        dict["elapsed"] = elapsed
        dict["total"] = total
        
      default:
        break
      }
      
      return dict
    }
  }
  
  public func playVideo() -> Observable<PlayEvent> {
    let totalTime = 5
    
    return Observable<Int>
      .interval(1, scheduler: MainScheduler.instance)
      .take(totalTime + 1)
      .map({.elapsedTime($0, totalTime)})
      .startWith(.startVideo)
      .concat(Observable.just(.stopVideo))
  }
}
