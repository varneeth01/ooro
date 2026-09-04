package com.ooro.screenplayer

import android.util.Log

interface CrashReporter { fun recordException(error: Throwable, context: Map<String, String> = emptyMap()); fun log(message: String) }
class LogcatCrashReporter : CrashReporter { override fun recordException(error: Throwable, context: Map<String, String>) { Log.e("OoroScreen", context.entries.joinToString { "${it.key}=${it.value}" }, error) }; override fun log(message: String) { Log.i("OoroScreen", message) } }
