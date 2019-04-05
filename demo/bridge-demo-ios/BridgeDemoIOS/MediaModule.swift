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
  public enum PlayEvent {
    case startVideo
    case stopVideo
    case progressVideo(Double, Double)
    
    private var type: String {
      switch self {
      case .startVideo: return "START_VIDEO"
      case .stopVideo: return "STOP_VIDEO"
      case .progressVideo: return "PROGRESS_VIDEO"
      }
    }
    
    public func toDictionary() -> [String : Any] {
      var dict: [String : Any] = ["type" : self.type]
      
      switch self {
      case .progressVideo(let elapsed, let total):
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
      .map({.progressVideo(Double($0), Double(totalTime))})
      .startWith(.startVideo)
      .concat(Observable.just(.stopVideo))
  }
}
