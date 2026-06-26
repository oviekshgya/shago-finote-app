package com.shago.notiflistener

import android.content.Context
import org.json.JSONObject

object WebhookConfigStore {
    private const val PREFS_NAME = "webhook_configs"
    private const val CONFIGS_KEY = "configs"

    fun getAll(context: Context): String =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(CONFIGS_KEY, "{}") ?: "{}"

    fun getForPackage(context: Context, packageName: String): JSONObject? {
        val configs = JSONObject(getAll(context))
        return configs.optJSONObject(packageName)
    }

    @Synchronized
    fun save(context: Context, config: JSONObject): Boolean {
        val packageName = config.optString("packageName")
        if (packageName.isBlank()) {
            return false
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val configs = JSONObject(prefs.getString(CONFIGS_KEY, "{}") ?: "{}")
        configs.put(packageName, config)
        return prefs.edit().putString(CONFIGS_KEY, configs.toString()).commit()
    }

    @Synchronized
    fun clear(context: Context, packageName: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val configs = JSONObject(prefs.getString(CONFIGS_KEY, "{}") ?: "{}")
        configs.remove(packageName)
        return prefs.edit().putString(CONFIGS_KEY, configs.toString()).commit()
    }
}
