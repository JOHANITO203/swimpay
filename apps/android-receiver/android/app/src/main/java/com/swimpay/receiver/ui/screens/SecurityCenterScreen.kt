@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.swimpay.receiver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SecurityCenterScreen() {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Sécurité", fontWeight = FontWeight.Bold) })
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            modifier = Modifier.size(64.dp),
                            shape = androidx.compose.foundation.shape.CircleShape,
                            color = Color.White.copy(alpha = 0.1f)
                        ) {
                            Icon(Icons.Default.Shield, null, tint = Color.White, modifier = Modifier.padding(16.dp))
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Coffre-Fort Chiffré", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("HMAC-SHA256 • SIGNAL INTÈGRE", color = Color.White.copy(alpha = 0.6f), fontSize = 10.sp, fontWeight = FontWeight.Black)
                    }
                }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SecurityListItem("Accès Biométrique", "FaceID / Empreinte", Icons.Default.Fingerprint, "Actif")
                    SecurityListItem("Rotation des Clés", "Auto-renouvellement", Icons.Default.Lock, "30j")
                    SecurityListItem("Sessions Actives", "Terminaux reliés", Icons.Default.Lan, "1")
                }
            }
        }
    }
}

@Composable
fun SecurityListItem(label: String, desc: String, icon: androidx.compose.ui.graphics.vector.ImageVector, status: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        tonalElevation = 1.dp
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.secondary)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(label, fontWeight = FontWeight.Bold)
                Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary)
            }
            Text(status, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
        }
    }
}



