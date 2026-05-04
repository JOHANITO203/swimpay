@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.swimpay.receiver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ConditionsScreen() {
    Scaffold(
        topBar = { CenterAlignedTopAppBar(title = { Text("Légal", fontWeight = FontWeight.Bold) }) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("DOCUMENTS OFFICIELS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            val docs = listOf("Conditions Générales", "Politique de Confidentialité", "Traitement des Données", "Mentions Légales")
            items(docs.size) { index ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    tonalElevation = 1.dp
                ) {
                    ListItem(
                        headlineContent = { Text(docs[index], fontWeight = FontWeight.Bold) },
                        supportingContent = { Text("PDF • 2.4 MB", fontSize = 12.sp) },
                        leadingContent = { Icon(Icons.Default.Article, null, tint = Color.Gray) },
                        trailingContent = { Icon(Icons.Default.ChevronRight, null, tint = Color.LightGray) }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    "L'utilisation de ce terminal implique l'acceptation sans réserve des clauses citées ci-dessus. Dernière mise à jour : 01/01/2026.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
    }
}



