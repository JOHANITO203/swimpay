package com.swimpay.receiver

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class DebugHttpRequest(
    val method: String,
    val path: String,
    val headers: Map<String, String> = emptyMap(),
    val body: String = ""
)

data class DebugHttpResponse(
    val statusCode: Int,
    val body: String
)

data class DebugHttpResult(
    val success: Boolean,
    val statusCode: Int?,
    val safeMessage: String,
    val deviceId: String? = null,
    val nextAction: String? = null
)

interface DebugHttpTransport {
    fun execute(request: DebugHttpRequest): DebugHttpResponse
}

class HttpUrlConnectionDebugTransport(
    private val baseUrl: String,
    private val timeoutMs: Int = 5_000
) : DebugHttpTransport {
    override fun execute(request: DebugHttpRequest): DebugHttpResponse {
        val connection = URL(baseUrl.trimEnd('/') + request.path).openConnection() as HttpURLConnection
        connection.requestMethod = request.method
        connection.connectTimeout = timeoutMs
        connection.readTimeout = timeoutMs
        connection.setRequestProperty("Accept", "application/json")
        for ((key, value) in request.headers) {
            connection.setRequestProperty(key, value)
        }

        if (request.body.isNotBlank()) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(request.body)
            }
        }

        val status = connection.responseCode
        val stream = if (status in 200..399) connection.inputStream else connection.errorStream
        val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        connection.disconnect()
        return DebugHttpResponse(statusCode = status, body = body)
    }
}

class DebugReceiverHttpClient(
    private val config: DebugBackendConfig,
    private val transport: DebugHttpTransport = HttpUrlConnectionDebugTransport(config.baseUrl)
) {
    fun health(): DebugHttpResult {
        return executeSafely(
            request = DebugHttpRequest(method = "GET", path = config.healthPath),
            successMessage = "backend reachable"
        )
    }

    fun registerDevice(): DebugHttpResult {
        val body = jsonObject(
            "device_name" to config.deviceName,
            "app_version" to config.appVersion,
            "android_version" to config.androidVersion,
            "public_key" to config.publicKey,
            "install_id" to config.installId,
            "supported_capabilities" to listOf(
                "notification_listener",
                "redacted_signal_upload",
                "debug_smoke"
            )
        )

        return executeSafely(
            request = DebugHttpRequest(
                method = "POST",
                path = "/v1/receiver-devices/register",
                headers = mapOf("Authorization" to "Bearer test_${config.merchantId}"),
                body = body
            ),
            successMessage = "receiver registration success"
        )
    }

    fun sendHeartbeat(deviceId: String): DebugHttpResult {
        val body = jsonObject(
            "device_id" to deviceId,
            "app_version" to config.appVersion,
            "android_version" to config.androidVersion,
            "notification_access_enabled" to true,
            "listener_connected" to true,
            "allowed_bank_profile_ids" to listOf("sber_ru"),
            "queue_length" to 0,
            "timestamp" to "2026-05-02T18:00:00.000Z"
        )

        return executeSafely(
            request = DebugHttpRequest(
                method = "POST",
                path = "/v1/receiver-devices/heartbeat",
                headers = mapOf("Authorization" to "Bearer test_${config.merchantId}"),
                body = body
            ),
            successMessage = "receiver heartbeat success"
        )
    }

    fun uploadSignal(signal: Map<String, Any>): DebugHttpResult {
        return uploadSignalJson(jsonObject(signal.entries.map { it.key to it.value }))
    }

    fun uploadSignalJson(signalJson: String): DebugHttpResult {
        return executeSafely(
            request = DebugHttpRequest(
                method = "POST",
                path = "/v1/receiver/signals",
                body = signalJson
            ),
            successMessage = "notification signal accepted; backend decision pending; not official bank confirmation"
        )
    }

    private fun executeSafely(
        request: DebugHttpRequest,
        successMessage: String
    ): DebugHttpResult {
        return try {
            val response = transport.execute(request)
            val success = response.statusCode in 200..299
            val deviceId = extractString(response.body, "device_id")
            val nextAction = extractString(response.body, "next_action")
            val message = if (success) {
                val suffix = nextAction?.let { "; $it" }.orEmpty()
                "$successMessage$suffix"
            } else {
                "backend returned safe error ${response.statusCode}"
            }

            DebugHttpResult(
                success = success,
                statusCode = response.statusCode,
                safeMessage = redactDebugMessage(message),
                deviceId = deviceId,
                nextAction = nextAction
            )
        } catch (_: Exception) {
            DebugHttpResult(
                success = false,
                statusCode = null,
                safeMessage = "backend unreachable"
            )
        }
    }
}

fun jsonObject(vararg entries: Pair<String, Any?>): String = jsonObject(entries.toList())

fun jsonObject(entries: Iterable<Pair<String, Any?>>): String {
    return entries.joinToString(prefix = "{", postfix = "}") { (key, value) ->
        "\"${escapeJson(key)}\":${jsonValue(value)}"
    }
}

fun jsonValue(value: Any?): String {
    return when (value) {
        null -> "null"
        is String -> "\"${escapeJson(value)}\""
        is Boolean -> value.toString()
        is Number -> value.toString()
        is Map<*, *> -> {
            val entries = value.entries.map { it.key.toString() to it.value }
            jsonObject(entries)
        }
        is Iterable<*> -> value.joinToString(prefix = "[", postfix = "]") { jsonValue(it) }
        else -> "\"${escapeJson(value.toString())}\""
    }
}

fun escapeJson(value: String): String {
    return buildString {
        for (char in value) {
            when (char) {
                '\\' -> append("\\\\")
                '"' -> append("\\\"")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                else -> append(char)
            }
        }
    }
}

fun extractString(body: String, key: String): String? {
    val pattern = Regex("\"${Regex.escape(key)}\"\\s*:\\s*\"([^\"]*)\"")
    return pattern.find(body)?.groupValues?.get(1)
}

fun redactDebugMessage(value: String): String {
    return value
        .replace(Regex("\\+\\d[\\d\\s()-]{6,}"), "<PHONE>")
        .replace(Regex("raw_notification|notification_text|raw_body|raw_title|raw_text", RegexOption.IGNORE_CASE), "<REDACTED>")
        .replace(Regex("public_key", RegexOption.IGNORE_CASE), "<REDACTED>")
        .replace(Regex("secret|token|password|api_key|signature", RegexOption.IGNORE_CASE), "<REDACTED>")
}
