//
//  LocationModule.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 2/7/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import RxSwift

public final class LocationModule {
  public struct Coordinate: ResponseType {
    public static func random() -> Coordinate {
      let latitude = Double.random(in: (0...100))
      let longitude = Double.random(in: (0...100))
      return Coordinate(latitude: latitude, longitude: longitude)
    }
    
    private let latitude: Double
    private let longitude: Double
    
    public func toDictionary() -> [String : Any?] {
      return ["latitude": self.latitude, "longitude": self.longitude]
    }
  }
  
  public func observeLocationChange() -> Observable<Coordinate> {
    return Observable<Int64>
      .interval(1, scheduler: MainScheduler.instance)
      .map({_ in Coordinate.random()})
  }
}
