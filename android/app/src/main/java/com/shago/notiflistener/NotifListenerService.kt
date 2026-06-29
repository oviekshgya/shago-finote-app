package com.shago.finote

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject
import java.util.UUID

class NotifListenerService : NotificationListenerService() {
    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        super.onNotificationPosted(sbn)
        if (sbn.packageName == packageName) {
            return
        }
        if (!CaptureFilterStore.shouldCapture(applicationContext, sbn.packageName)) {
            Log.d(TAG, "Ignored notification from ${sbn.packageName} by capture filter")
            return
        }

        try {
            val extras = sbn.notification.extras
            val logId = UUID.randomUUID().toString()
            val webhookConfig = WebhookConfigStore.getForPackage(applicationContext, sbn.packageName)
            val webhookEnabled = webhookConfig?.optBoolean("enabled", false) == true &&
                webhookConfig.optString("url").isNotBlank()
            val log = JSONObject().apply {
                put("id", logId)
                put("packageName", sbn.packageName)
                put("notificationId", sbn.id)
                put("tag", sbn.tag)
                put("title", extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty())
                put("text", extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty())
                put("subText", extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString().orEmpty())
                put("bigText", extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty())
                put("postTime", sbn.postTime)
                put("receivedAt", System.currentTimeMillis())
                put("webhookStatus", if (webhookEnabled) "pending" else "disabled")
            }

            NotificationStore.add(applicationContext, log)
            NotificationModule.emitNotificationCaptured(log.toString())
            Log.d(TAG, "Stored notification from ${sbn.packageName}")
            if (webhookEnabled && webhookConfig != null) {
                Thread {
                    val result = WebhookSender.send(webhookConfig, log)
                    NotificationStore.updateWebhookResult(
                        applicationContext,
                        logId,
                        if (result.success) "sent" else "failed",
                        result.sentAt,
                        result.httpStatus,
                        result.error,
                    )
                    Log.d(TAG, "Webhook ${if (result.success) "sent" else "failed"} for ${sbn.packageName}")
                }.start()
            }
        } catch (error: Exception) {
            Log.e(TAG, "Failed to store notification", error)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        super.onNotificationRemoved(sbn)
        Log.d(TAG, "Notification removed from ${sbn.packageName}")
    }

    companion object {
        private const val TAG = "NotifListener"
    }
}
