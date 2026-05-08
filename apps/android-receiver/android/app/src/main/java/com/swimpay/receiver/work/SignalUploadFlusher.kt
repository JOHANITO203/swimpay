package com.swimpay.receiver.work

import com.swimpay.receiver.outbox.EncryptedOutboxStore
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class SignalUploadRequest(
    val method: String,
    val path: String,
    val headers: Map<String, String> = emptyMap(),
    val body: String
)

data class SignalUploadResponse(
    val statusCode: Int,
    val body: String
)

interface SignalUploadTransport {
    fun execute(request: SignalUploadRequest): SignalUploadResponse
}

class HttpUrlConnectionSignalUploadTransport(
    private val baseUrl: String,
    private val timeoutMs: Int = 5_000
) : SignalUploadTransport {
    override fun execute(request: SignalUploadRequest): SignalUploadResponse {
        val connection = URL(baseUrl.trimEnd('/') + request.path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = request.method
            connection.connectTimeout = timeoutMs
            connection.readTimeout = timeoutMs
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Content-Type", "application/json")
            for ((key, value) in request.headers) {
                connection.setRequestProperty(key, value)
            }
            connection.doOutput = true
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(request.body)
            }

            val status = connection.responseCode
            val stream = if (status in 200..399) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            return SignalUploadResponse(statusCode = status, body = body)
        } finally {
            connection.disconnect()
        }
    }
}

data class SignalUploadFlushResult(
    val success: Boolean,
    val acked: Int,
    val failedRetrying: Int,
    val safeMessage: String
)

class SignalUploadFlusher(
    private val outboxStore: EncryptedOutboxStore,
    private val transport: SignalUploadTransport,
    private val nowIso: () -> String = { java.time.Instant.now().toString() },
    private val nextRetryIso: () -> String = { java.time.Instant.now().plusMillis(DEFAULT_RETRY_DELAY_MS).toString() }
) {
    companion object {
        const val SIGNAL_UPLOAD_PATH = "/v1/receiver/signals"
        const val DEFAULT_RETRY_DELAY_MS = 60_000L

        fun forBaseUrl(outboxStore: EncryptedOutboxStore, baseUrl: String): SignalUploadFlusher {
            return SignalUploadFlusher(
                outboxStore = outboxStore,
                transport = HttpUrlConnectionSignalUploadTransport(baseUrl)
            )
        }
    }

    fun flushDue(): SignalUploadFlushResult {
        var acked = 0
        var failedRetrying = 0
        val due = outboxStore.dueRecords(nowIso())
        for (record in due) {
            val attemptAt = nowIso()
            if (!isSafeUploadPayload(record.encryptedPayload)) {
                outboxStore.markFailedRetrying(
                    eventId = record.eventId,
                    sanitizedError = "unsafe signal upload payload blocked",
                    nextRetryAt = nextRetryIso(),
                    lastAttemptAt = attemptAt
                )
                failedRetrying += 1
                continue
            }

            outboxStore.markUploading(record.eventId)
            val accepted = runCatching {
                val response = transport.execute(
                    SignalUploadRequest(
                        method = "POST",
                        path = SIGNAL_UPLOAD_PATH,
                        body = record.encryptedPayload
                    )
                )
                response.statusCode in 200..299
            }.getOrDefault(false)

            if (accepted) {
                outboxStore.markAcked(record.eventId, nowIso())
                acked += 1
            } else {
                outboxStore.markFailedRetrying(
                    eventId = record.eventId,
                    sanitizedError = "backend signal upload failed",
                    nextRetryAt = nextRetryIso(),
                    lastAttemptAt = attemptAt
                )
                failedRetrying += 1
            }
        }

        val success = failedRetrying == 0
        val message = if (due.isEmpty()) {
            "runtime outbox empty"
        } else {
            "runtime outbox flush result: acked=$acked failed_retrying=$failedRetrying; backend decision pending; not official bank confirmation"
        }
        return SignalUploadFlushResult(
            success = success,
            acked = acked,
            failedRetrying = failedRetrying,
            safeMessage = message
        )
    }

    private fun isSafeUploadPayload(payload: String): Boolean {
        val forbiddenRawKeys = Regex(
            "\"(?:raw_title|raw_body|raw_notification|raw_text|raw_phone|raw_card|card_number|source_card|pan)\"\\s*:",
            RegexOption.IGNORE_CASE
        )
        val rawTextPresentTrue = Regex("\"raw_text_present\"\\s*:\\s*true", RegexOption.IGNORE_CASE)
        val phoneLike = Regex("\\+\\d[\\d\\s()-]{6,}")
        return !payload.contains(forbiddenRawKeys) && !payload.contains(rawTextPresentTrue) && !payload.contains(phoneLike)
    }
}
