package com.viethai.demo

import io.reactivex.BackpressureStrategy
import io.reactivex.Flowable
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

/** Created by viethai.pham on 29/3/19 */
class StorageModule {
  private val lock: ReentrantReadWriteLock = ReentrantReadWriteLock()
  private val keyStore = hashMapOf<String, Any?>()
  private val observers = hashMapOf<String, (Any?) -> Unit>()

  fun setValue(key: String, value: Any?) {
    this.lock.write {
      this@StorageModule.keyStore[key] = value
      this@StorageModule.observers.forEach { it.value(value) }
    }
  }

  fun getValue(key: String): Any? {
    return this.lock.read { this.keyStore[key] }
  }

  fun observeValue(key: String, observer: (Any?) -> Unit): Flowable<Any> {
    return Flowable.create({ emitter ->
      this@StorageModule.lock.write { this@StorageModule.observers[key] = observer }

      emitter.setCancellable {
        this@StorageModule.lock.write { this@StorageModule.observers.remove(key) }
      }
    }, BackpressureStrategy.BUFFER)
  }
}
