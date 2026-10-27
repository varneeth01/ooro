package com.ooro.driver

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AuthoritativeStatusStep(vm: DriverAppViewModel) {
    val dashboard by vm.dashboard.collectAsState()
    val status = dashboard.onboarding
    LaunchedEffect(Unit) { vm.refreshOnboardingStatus() }
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Application status")
            Text(status?.onboardingStatus?.replace('_', ' ') ?: "Checking with OORO…")
            Text("Verification and activation are decided by OORO. This app never marks documents or approval complete locally.")
            if (dashboard.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        items(status?.documents.orEmpty().filter { it.status == "REJECTED" }) { document ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("Changes needed: ${document.type}")
                    Text(document.rejectionReason ?: "Please upload a clearer document.")
                    OutlinedButton(onClick = { vm.showOnboarding() }) { Text("Correct and resubmit") }
                }
            }
        }
        item {
            Spacer(Modifier.height(4.dp))
            OutlinedButton(onClick = { vm.refreshOnboardingStatus() }) { Text("Refresh status") }
            if (status?.onboardingStatus == "APPROVED" && status.accountStatus == "ACTIVE") {
                Button(onClick = { vm.reconcileApproval() }) { Text("Open driver home") }
            }
        }
    }
}
