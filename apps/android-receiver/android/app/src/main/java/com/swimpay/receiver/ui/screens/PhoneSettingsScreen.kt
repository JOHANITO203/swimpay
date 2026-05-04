@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.swimpay.receiver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PhoneSettingsScreen() {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Paramètres Android", fontWeight = FontWeight.Bold) })
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Surface(
                    modifier = Modifier.size(80.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Icon(Icons.Default.Smartphone, null, modifier = Modifier.padding(20.dp), tint = MaterialTheme.colorScheme.primary)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("Sync Agent v2.4", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text("ID: #TERM-8821", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9).copy(alpha = 0.5f))
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(modifier = Modifier.size(8.dp), shape = androidx.compose.foundation.shape.CircleShape, color = Color(0xFF2E7D32)) {}
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Service Actif", fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20))
                        Spacer(modifier = Modifier.weight(1f))
                        Text("CONNECTÉ", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF1B5E20))
                    }
                }
            }

            item {
                Text("CONFIG AGENT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Surface(shape = RoundedCornerShape(20.dp), tonalElevation = 1.dp) {
                    Column {
                        SwitchItem("Accès notifications", true, Icons.Default.NotificationsActive)
                        Divider(modifier = Modifier.padding(horizontal = 16.dp))
                        SwitchItem("Gestion Énergie", false, Icons.Default.BatteryChargingFull)
                        Divider(modifier = Modifier.padding(horizontal = 16.dp))
                        SwitchItem("Auto-Démarrage", true, Icons.Default.AutoMode)
                    }
                }
            }

            item {
                TextButton(onClick = {}, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
                    Text("RÉINITIALISER LE TERMINAL", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun SwitchItem(label: String, checked: Boolean, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    ListItem(
        headlineContent = { Text(label, fontWeight = FontWeight.Medium) },
        leadingContent = { Icon(icon, null, tint = MaterialTheme.colorScheme.primary) },
        trailingContent = { Switch(checked = checked, onCheckedChange = {}) }
    )
}



