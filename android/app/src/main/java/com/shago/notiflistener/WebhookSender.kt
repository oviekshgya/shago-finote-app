package com.shago.finote

import android.util.Base64
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object WebhookSender {
    data class Result(
        val success: Boolean,
        val sentAt: Long,
        val httpStatus: Int?,
        val error: String?,
    )

    fun send(config: JSONObject, log: JSONObject): Result {
        val sentAt = System.currentTimeMillis()
        return try {
            val method = config.optString("method", "POST").uppercase()
            val payload = buildPayload(config, log)
            val targetUrl = if (method == "GET") {
                appendQuery(config.optString("url"), payload)
            } else {
                config.optString("url")
            }
            val connection = (URL(targetUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 12000
                readTimeout = 12000
                setRequestProperty("Accept", "application/json")
                applyAuthAndHeaders(this, config)
            }

            if (method == "POST") {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(payload.toString())
                }
            }

            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            stream?.use { input ->
                BufferedReader(InputStreamReader(input)).readText()
            }
            connection.disconnect()
            Result(code in 200..299, sentAt, code, null)
        } catch (error: Exception) {
            Result(false, sentAt, null, error.message ?: error.javaClass.simpleName)
        }
    }

    private fun buildPayload(config: JSONObject, log: JSONObject): JSONObject {
        val fields = config.optJSONObject("fields")
        val payload = JSONObject()
        val keys = listOf(
            "id",
            "packageName",
            "notificationId",
            "tag",
            "title",
            "text",
            "subText",
            "bigText",
            "postTime",
            "receivedAt",
        )

        keys.forEach { key ->
            if (fields == null || fields.optBoolean(key, true)) {
                payload.put(key, log.opt(key))
            }
        }

        return payload
    }

    private fun appendQuery(baseUrl: String, payload: JSONObject): String {
        val separator = if (baseUrl.contains("?")) "&" else "?"
        val query = payload.keys().asSequence().joinToString("&") { key ->
            val value = payload.opt(key)?.toString().orEmpty()
            "${key.encode()}=${value.encode()}"
        }
        return "$baseUrl$separator$query"
    }

    private fun applyAuthAndHeaders(connection: HttpURLConnection, config: JSONObject) {
        when (config.optString("authType", "none")) {
            "bearer" -> {
                val token = config.optString("bearerToken")
                if (token.isNotBlank()) {
                    connection.setRequestProperty("Authorization", "Bearer $token")
                }
            }
            "basic" -> {
                val raw = "${config.optString("basicUsername")}:${config.optString("basicPassword")}"
                val encoded = Base64.encodeToString(raw.toByteArray(), Base64.NO_WRAP)
                connection.setRequestProperty("Authorization", "Basic $encoded")
            }
            "custom" -> applyCustomHeaders(connection, config.optString("customHeaders"))
        }
    }

    private fun applyCustomHeaders(connection: HttpURLConnection, rawHeaders: String) {
        if (rawHeaders.isBlank()) {
            return
        }

        val headers = JSONObject(rawHeaders)
        headers.keys().forEach { key ->
            connection.setRequestProperty(key, headers.optString(key))
        }
    }

    private fun String.encode(): String = URLEncoder.encode(this, "UTF-8")
}
