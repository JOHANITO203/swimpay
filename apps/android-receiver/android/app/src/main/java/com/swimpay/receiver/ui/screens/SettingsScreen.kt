@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.swimpay.receiver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SettingsScreen() {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            ProfileHeader()
        }
        
        item {
            SettingsSection("INFRASTRUCTURE", listOf(
                SettingItem("Paramètres Android", Icons.Default.Smartphone),
                SettingItem("Canaux de Réception", Icons.Default.CreditCard),
                SettingItem("Comptes Bancaires", Icons.Default.AccountBalance)
            ))
        }
        
        item {
            SettingsSection("SUPPORT", listOf(
                SettingItem("Centre de Sécurité", Icons.Default.Shield),
                SettingItem("Aide & Assistance", Icons.Default.Help)
            ))
        }

        item {
            TextButton(
                onClick = {},
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
            ) {
                Icon(Icons.Default.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("SE DÉCONNECTER", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun ProfileHeader() {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(vertical = 16.dp)) {
        Surface(
            modifier = Modifier.size(96.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text("JD", color = MaterialTheme.colorScheme.primary, fontSize = 32.sp, fontWeight = FontWeight.Black)
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text("Terminal Marchand", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Text("UID: #7114-4466-8301", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
    }
}

@Composable
fun SettingsSection(title: String, items: List<SettingItem>) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title, 
            style = MaterialTheme.typography.labelSmall, 
            color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.padding(start = 8.dp, bottom = 8.dp)
        )
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            tonalElevation = 1.dp
        ) {
            Column {
                items.forEachIndexed { index, item ->
                    ListItem(
                        headlineContent = { Text(item.label, fontWeight = FontWeight.Medium) },
                        leadingContent = { 
                            Icon(item.icon, contentDescription = null, tint = MaterialTheme.colorScheme.secondary) 
                        },
                        trailingContent = {
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.outlineVariant)
                        }
                    )
                    if (index < items.size - 1) {
                        Divider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant)
                    }
                }
            }
        }
    }
}

data class SettingItem(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)



