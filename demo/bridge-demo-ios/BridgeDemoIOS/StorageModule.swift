//
//  StorageModule.swift
//  BridgeDemoIOS
//
//  Created by Viethai Pham on 1/4/19.
//  Copyright © 2019 Viet Hai Pham. All rights reserved.
//

import Foundation
import RxSwift

final class StorageModule {
  private let dispatchQueue: DispatchQueue
  private var storage: [String : Any?]
  private var observers: [String : (Any?) -> Void]
  
  init() {
    self.dispatchQueue = DispatchQueue.global(qos: .background)
    self.storage = [:]
    self.observers = [:]
  }
  
  private func writeSafely(block: @escaping () -> Void) {
    self.dispatchQueue.async(flags: .barrier, execute: block)
  }
  
  func setValue(key: String, value: Any?) {
    self.writeSafely { self.storage[key] = value; self.observers[key]?(value) }
  }
  
  func observeValue(key: String, observer: @escaping (Any?) -> Void) -> Observable<Any> {
    return Observable.create({_ in
      self.writeSafely { self.observers[key] = observer }
      
      return Disposables.create {
        self.writeSafely { self.observers.removeValue(forKey: key) }
      }
    })
  }
}
