package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BackendStatusRefresherTest {
    @Test
    fun reportsReachableBackendWithSafeTimestamp() {
        val transport = RecordingStatusTransport(DebugHttpResponse(200, """{"service":"swimpay-api"}"""))
        val refresher = BackendStatusRefresher(
            httpClient = DebugReceiverHttpClient(DebugBackendConfig(), transport),
            nowIso = { "2026-05-02T18:00:00.000Z" }
        )

        val status = refresher.refresh()

        assertTrue(status.reachable)
        assertEquals("2026-05-02T18:00:00.000Z", status.checkedAt)
        assertEquals("backend reachable", status.safeMessage)
        assertEquals("/api-health", transport.requests.single().path)
    }

    @Test
    fun reportsUnreachableBackendWithRedactedError() {
        val refresher = BackendStatusRefresher(
            httpClient = DebugReceiverHttpClient(DebugBackendConfig(), ThrowingStatusTransport()),
            nowIso = { "2026-05-02T18:00:00.000Z" }
        )

        val status = refresher.refresh()

        assertFalse(status.reachable)
        assertEquals("backend unreachable", status.safeMessage)
        assertFalse(status.toString().contains("+79991234567"))
        assertFalse(status.toString().contains("token", ignoreCase = true))
    }
}

private class RecordingStatusTransport(private val response: DebugHttpResponse) : DebugHttpTransport {
    val requests = mutableListOf<DebugHttpRequest>()

    override fun execute(request: DebugHttpRequest): DebugHttpResponse {
        requests.add(request)
        return response
    }
}

private class ThrowingStatusTransport : DebugHttpTransport {
    override fun execute(request: DebugHttpRequest): DebugHttpResponse {
        throw IllegalStateException("backend unreachable +79991234567 token")
    }
}

