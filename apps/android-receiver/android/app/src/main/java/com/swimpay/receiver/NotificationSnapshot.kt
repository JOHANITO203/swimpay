package com.swimpay.receiver

data class NotificationSnapshot(
    val packageName: String,
    val notificationId: Int,
    val tag: String?,
    val postTime: Long,
    val channelId: String?,
    val groupKey: String?,
    val sortKey: String?,
    val title: String?,
    val text: String?,
    val bigText: String?,
    val subText: String?,
    val summaryText: String?,
    val textLines: List<String>,
    val tickerText: String?
)
