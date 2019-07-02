package com.viethai.demo

import io.reactivex.Flowable
import java.util.*
import java.util.concurrent.TimeUnit

/** Created by viethai.pham on 2019-07-02 */
class LocationModule {
  data class Coordinate(private val latitude: Double, private val longitude: Double) {
    companion object {
      private val randomizer = Random()

      fun random(): Coordinate {
        val latitude = this.randomizer.nextDouble()
        val longitude = this.randomizer.nextDouble()
        return Coordinate(latitude, longitude)
      }
    }
  }

  fun observeLocationStream(): Flowable<Coordinate> {
    return Flowable.interval(1000, TimeUnit.MILLISECONDS).map { Coordinate.random() }
  }
}

