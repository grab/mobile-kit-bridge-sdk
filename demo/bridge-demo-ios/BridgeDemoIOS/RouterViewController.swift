//
//  RouterViewController.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 11/7/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import CoreLocation
import UIKit

public final class RouterViewController: UIViewController {
  private var locationManager: CLLocationManager!
  
  override public func viewDidLoad() {
    super.viewDidLoad()
    locationManager = CLLocationManager()
    locationManager.requestWhenInUseAuthorization()
    locationManager.startUpdatingLocation()
  }
}
