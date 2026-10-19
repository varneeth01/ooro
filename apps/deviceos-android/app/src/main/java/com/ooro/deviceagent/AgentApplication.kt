package com.ooro.deviceagent

import android.app.Application
import com.ooro.deviceagent.sync.WorkScheduler

class AgentApplication : Application() { override fun onCreate() { super.onCreate(); WorkScheduler.enqueue(this) } }
