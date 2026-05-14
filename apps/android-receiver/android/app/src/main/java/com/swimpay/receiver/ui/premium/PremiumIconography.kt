package com.swimpay.receiver.ui.premium

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Shared iconography for premium merchant surfaces.
 * Keeps visual continuity across onboarding, dashboard, review and integration screens.
 */
object PremiumIcons {
    val FastDetection: ImageVector = Icons.Default.Bolt
    val ManualReview: ImageVector = Icons.AutoMirrored.Filled.ReceiptLong
    val ConnectedSite: ImageVector = Icons.Default.Link
    val Bank: ImageVector = Icons.Default.AccountBalance
    val CardTransfer: ImageVector = Icons.Default.CreditCard
    val PhoneTransfer: ImageVector = Icons.Default.PhoneAndroid
    val ToConfirm: ImageVector = Icons.Default.HourglassTop
    val Confirmed: ImageVector = Icons.Default.CheckCircle
    val Rejected: ImageVector = Icons.Default.Block
    val Security: ImageVector = Icons.Default.Shield
    val Support: ImageVector = Icons.Default.HeadsetMic
    val HelpCenter: ImageVector = Icons.AutoMirrored.Filled.Help
    val Appearance: ImageVector = Icons.Default.Palette
    val Language: ImageVector = Icons.Default.Language
    val ConfirmationMode: ImageVector = Icons.Default.VerifiedUser
    val Sales: ImageVector = Icons.Default.Storefront
}
