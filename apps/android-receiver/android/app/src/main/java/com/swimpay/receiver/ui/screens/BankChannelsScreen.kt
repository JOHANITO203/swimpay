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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun BankChannelsScreen() {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Canaux de réception", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    AddMethodButton(Modifier.weight(1f), "AJOUTER CARTE", Icons.Default.CreditCard)
                    AddMethodButton(Modifier.weight(1f), "AJOUTER MOBILE", Icons.Default.Smartphone)
                }
            }

            item {
                Text("CONFIGURATIONS ACTIVES", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                Spacer(modifier = Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    ActiveBankItem("Sberbank Platinum", "• • • • 4821")
                    ActiveBankItem("T-Bank Business", "+7 * * * 45-67")
                }
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Security, null, tint = Color.Gray)
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text("CONFIDENTIALITÉ", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                            Text("Aucun identifiant complet ne quitte ce terminal.", fontSize = 10.sp, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AddMethodButton(modifier: Modifier, label: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    OutlinedButton(
        onClick = {},
        modifier = modifier.height(100.dp),
        shape = RoundedCornerShape(20.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.LightGray.copy(alpha = 0.5f))
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(label, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}

@Composable
fun ActiveBankItem(name: String, id: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        tonalElevation = 1.dp
    ) {
        Column {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(modifier = Modifier.size(40.dp), shape = RoundedCornerShape(8.dp), color = Color.LightGray.copy(alpha = 0.1f)) {
                    Icon(Icons.Default.AccountBalance, null, modifier = Modifier.padding(8.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(name, fontWeight = FontWeight.Bold)
                    Text(id, fontSize = 12.sp, color = MaterialTheme.colorScheme.secondary)
                }
                Badge(containerColor = Color(0xFFE8F5E9)) { Text("ACTIF", color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold, fontSize = 8.sp) }
            }
            Divider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = {}, modifier = Modifier.weight(1f)) { Text("Modifier", color = MaterialTheme.colorScheme.secondary) }
                TextButton(onClick = {}, modifier = Modifier.weight(1f)) { Text("Pause", color = MaterialTheme.colorScheme.secondary) }
            }
        }
    }
}



