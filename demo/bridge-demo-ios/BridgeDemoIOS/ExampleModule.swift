//
//  ExampleModule.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 1/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation

final class ExampleModule {
  enum StreamState {
    case active
    case complete
  }
  
  private let dispatchQueue: DispatchQueue
  private var storage: [String : Any?]
  private var observers: [String : (String, Any?, StreamState) -> Void]
  
  init() {
    self.dispatchQueue = DispatchQueue.global(qos: .background)
    self.storage = [:]
    self.observers = [:]
  }
  
  func setValue(key: String, value: Any?) {
    self.dispatchQueue.async(flags: .barrier) {
      self.storage[key] = value
      self.observers[key]?(key, value, .active)
    }
  }
  
  func observeValue(key: String, observer: @escaping (String, Any?, StreamState) -> Void) {
    self.dispatchQueue.async(flags: .barrier) {
      self.observers[key] = observer
    }
  }
  
  func unsubscribeFromObserver(key: String) {
    self.dispatchQueue.async(flags: .barrier) {
      self.observers.removeValue(forKey: key)?(key, nil, .complete)
    }
  }
}
