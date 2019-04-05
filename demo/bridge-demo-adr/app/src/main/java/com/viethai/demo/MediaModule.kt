package com.viethai.demo

import io.reactivex.Flowable
import java.util.concurrent.TimeUnit

/** Created by viethai.pham on 4/4/19 */
class MediaModule {
  sealed class PlayEvent(val type: String) {
    object StartVideo : PlayEvent("START_VIDEO")
    object StopVideo : PlayEvent("STOP_VIDEO")
    data class ElapsedTime(val elapsed: Int, val total: Int) : PlayEvent("PROGRESS_VIDEO")
  }

  fun playVideo(): Flowable<PlayEvent> {
    val totalTime = 5

    return Flowable.interval(0, 1, TimeUnit.SECONDS)
      .take(totalTime.toLong() + 1)
      .map { PlayEvent.ElapsedTime(it.toInt(), totalTime) as PlayEvent }
      .startWith(PlayEvent.StartVideo)
      .concatWith(Flowable.just(PlayEvent.StopVideo))
  }
}
