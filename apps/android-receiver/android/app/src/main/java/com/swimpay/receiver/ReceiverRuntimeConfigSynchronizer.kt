package com.swimpay.receiver

object ReceiverRuntimeConfigSynchronizer {
    fun syncFromResponseBody(
        body: String,
        writer: ReceiverRuntimeConfigWriter
    ): Boolean {
        val config = parseReceiverRuntimeConfig(body) ?: return false
        writer.save(config)
        return true
    }
}
