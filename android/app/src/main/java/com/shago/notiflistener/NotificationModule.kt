package com.shago.notiflistener

import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray
import org.json.JSONObject

class NotificationModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "NotificationModule"

    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("OPEN_SETTINGS_FAILED", error)
        }
    }

    @ReactMethod
    fun isListenerEnabled(promise: Promise) {
        try {
            promise.resolve(isNotificationListenerEnabled())
        } catch (error: Exception) {
            promise.reject("CHECK_LISTENER_FAILED", error)
        }
    }

    @ReactMethod
    fun getLogs(promise: Promise) {
        try {
            promise.resolve(NotificationStore.getLogs(reactContext))
        } catch (error: Exception) {
            promise.reject("GET_LOGS_FAILED", error)
        }
    }

    @ReactMethod
    fun clearLogs(promise: Promise) {
        try {
            promise.resolve(NotificationStore.clear(reactContext))
        } catch (error: Exception) {
            promise.reject("CLEAR_LOGS_FAILED", error)
        }
    }

    @ReactMethod
    fun getWebhookConfigs(promise: Promise) {
        try {
            promise.resolve(WebhookConfigStore.getAll(reactContext))
        } catch (error: Exception) {
            promise.reject("GET_WEBHOOK_CONFIGS_FAILED", error)
        }
    }

    @ReactMethod
    fun saveWebhookConfig(configJson: String, promise: Promise) {
        try {
            val config = JSONObject(configJson)
            promise.resolve(WebhookConfigStore.save(reactContext, config))
        } catch (error: Exception) {
            promise.reject("SAVE_WEBHOOK_CONFIG_FAILED", error)
        }
    }

    @ReactMethod
    fun clearWebhookConfig(packageName: String, promise: Promise) {
        try {
            promise.resolve(WebhookConfigStore.clear(reactContext, packageName))
        } catch (error: Exception) {
            promise.reject("CLEAR_WEBHOOK_CONFIG_FAILED", error)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val apps = reactContext.packageManager
                .queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL)
                .map { resolveInfo ->
                    JSONObject().apply {
                        put("packageName", resolveInfo.activityInfo.packageName)
                        put("label", resolveInfo.loadLabel(reactContext.packageManager).toString())
                    }
                }
                .distinctBy { app -> app.optString("packageName") }
                .sortedBy { app -> app.optString("label").lowercase() }

            promise.resolve(JSONArray(apps).toString())
        } catch (error: Exception) {
            promise.reject("GET_INSTALLED_APPS_FAILED", error)
        }
    }

    @ReactMethod
    fun getCaptureFilter(promise: Promise) {
        try {
            promise.resolve(CaptureFilterStore.get(reactContext))
        } catch (error: Exception) {
            promise.reject("GET_CAPTURE_FILTER_FAILED", error)
        }
    }

    @ReactMethod
    fun saveCaptureFilter(filterJson: String, promise: Promise) {
        try {
            promise.resolve(CaptureFilterStore.save(reactContext, JSONObject(filterJson)))
        } catch (error: Exception) {
            promise.reject("SAVE_CAPTURE_FILTER_FAILED", error)
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val packageName = reactContext.packageName
        val enabledListeners = Settings.Secure.getString(
            reactContext.contentResolver,
            "enabled_notification_listeners",
        ) ?: return false

        return enabledListeners
            .split(":")
            .mapNotNull { raw -> raw.substringBefore("/").ifBlank { null } }
            .any { enabledPackage -> enabledPackage == packageName }
    }
}
