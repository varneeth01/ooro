package com.ooro.driver.notifications

import com.ooro.driver.domain.RideEventType

data class RemoteParserConfig(val provider: String, val version: Long, val patterns: Map<RideEventType, List<String>>, val signature: String)
interface ParserConfigRepository { suspend fun get(provider: String): RemoteParserConfig?; suspend fun refresh(): List<RemoteParserConfig> }
class MockParserConfigRepository : ParserConfigRepository { override suspend fun get(provider: String): RemoteParserConfig? = null; override suspend fun refresh(): List<RemoteParserConfig> = emptyList() }
