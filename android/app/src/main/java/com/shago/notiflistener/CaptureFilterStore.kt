package com.shago.finote

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object CaptureFilterStore {
    private const val PREFS_NAME = "capture_filter"
    private const val FILTER_KEY = "filter"

    private fun defaultFilter(): JSONObject =
        JSONObject().apply {
            put("captureAll", false)
            put("packages", JSONArray())
        }

    fun get(context: Context): String =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(FILTER_KEY, null) ?: defaultFilter().toString()

    fun save(context: Context, filter: JSONObject): Boolean {
        if (!filter.has("captureAll")) {
            filter.put("captureAll", false)
        }
        if (!filter.has("packages")) {
            filter.put("packages", JSONArray())
        }
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(FILTER_KEY, filter.toString())
            .commit()
    }

    fun shouldCapture(context: Context, packageName: String): Boolean {
        val filter = JSONObject(get(context))
        if (filter.optBoolean("captureAll", false)) {
            return true
        }

        val packages = filter.optJSONArray("packages") ?: return false
        for (index in 0 until packages.length()) {
            if (packages.optString(index) == packageName) {
                return true
            }
        }
        return false
    }
}
