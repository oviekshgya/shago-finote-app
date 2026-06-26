package com.shago.notiflistener

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object NotificationStore {
    private const val PREFS_NAME = "notification_logs"
    private const val LOGS_KEY = "logs"
    private const val MAX_LOGS = 500

    @Synchronized
    fun add(context: Context, log: JSONObject) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = JSONArray(prefs.getString(LOGS_KEY, "[]") ?: "[]")
        val next = JSONArray()
        next.put(log)

        val maxExisting = minOf(current.length(), MAX_LOGS - 1)
        for (index in 0 until maxExisting) {
            next.put(current.getJSONObject(index))
        }

        prefs.edit().putString(LOGS_KEY, next.toString()).apply()
    }

    @Synchronized
    fun updateWebhookResult(
        context: Context,
        id: String,
        status: String,
        sentAt: Long,
        httpStatus: Int?,
        error: String?,
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = JSONArray(prefs.getString(LOGS_KEY, "[]") ?: "[]")
        val next = JSONArray()

        for (index in 0 until current.length()) {
            val item = current.getJSONObject(index)
            if (item.optString("id") == id) {
                item.put("webhookStatus", status)
                item.put("webhookSentAt", sentAt)
                if (httpStatus != null) {
                    item.put("webhookHttpStatus", httpStatus)
                }
                if (!error.isNullOrBlank()) {
                    item.put("webhookError", error)
                }
            }
            next.put(item)
        }

        prefs.edit().putString(LOGS_KEY, next.toString()).apply()
    }

    fun getLogs(context: Context): String =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(LOGS_KEY, "[]") ?: "[]"

    fun clear(context: Context): Boolean =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(LOGS_KEY, "[]")
            .commit()
}
