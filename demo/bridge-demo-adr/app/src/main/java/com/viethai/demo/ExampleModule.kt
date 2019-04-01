package com.viethai.demo

import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

/** Created by viethai.pham on 29/3/19 */
class ExampleModule {
  enum class StreamState {
    ACTIVE,
    COMPLETED
  }

  private val lock: ReentrantReadWriteLock = ReentrantReadWriteLock()
  private val keyStore = hashMapOf<String, Any?>()
  private val observers = hashMapOf<String, (String, Any?, StreamState) -> Unit>()

  fun setValue(key: String, value: Any?) {
    this.lock.write {
      this@ExampleModule.keyStore[key] = value
      this@ExampleModule.observers.forEach { it.value(key, value, StreamState.ACTIVE) }
    }
  }

  fun getValue(key: String): Any? {
    return this.lock.read { this.keyStore[key] }
  }

  fun observeValue(key: String, observer: (String, Any?, StreamState) -> Unit) {
    this.lock.write { this@ExampleModule.observers[key] = observer }
  }

  fun unsubscribeFromObserver(key: String) {
    this.lock.write {
      this@ExampleModule.observers.remove(key)?.invoke(key, null, StreamState.COMPLETED)
    }
  }
}
