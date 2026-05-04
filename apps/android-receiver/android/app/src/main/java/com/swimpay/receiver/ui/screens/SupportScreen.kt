@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.swimpay.receiver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SupportScreen() {
    Scaffold(
        topBar = { CenterAlignedTopAppBar(title = { Text("Aide & Support", fontWeight = FontWeight.Bold) }) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Text("RESSOURCES", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                Spacer(modifier = Modifier.height(8.dp))
                Surface(shape = RoundedCornerShape(20.dp), tonalElevation = 1.dp) {
                    Column {
                        SupportListItem("Base de connaissances", "Guides et tutos", Icons.Default.Article)
                        Divider(modifier = Modifier.padding(horizontal = 16.dp))
                        SupportListItem("Latence Réseau", "État des serveurs", Icons.Default.Storage)
                        Divider(modifier = Modifier.padding(horizontal = 16.dp))
                        SupportListItem("Historique Tickets", "Vos demandes", Icons.Default.Send)
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Besoin d'aide immédiate ?", fontWeight = FontWeight.Bold)
                        Text(
                            "Réponse en moins de 15 min sur notre canal Telegram.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                        )
                        Button(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                            Text("REJOINDRE LE TELEGRAM")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SupportListItem(label: String, desc: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    ListItem(
        headlineContent = { Text(label, fontWeight = FontWeight.Bold) },
        supportingContent = { Text(desc, fontSize = 12.sp) },
        leadingContent = { Icon(icon, null, tint = MaterialTheme.colorScheme.primary) },
        trailingContent = { Icon(Icons.Default.ChevronRight, null, tint = Color.LightGray) }
    )
}



