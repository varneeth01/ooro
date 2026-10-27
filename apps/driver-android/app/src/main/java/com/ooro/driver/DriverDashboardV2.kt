package com.ooro.driver

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.background
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable
fun DriverDashboardV2(vm: DriverAppViewModel) {
    var tab by remember { mutableStateOf("HOME") }
    LaunchedEffect(Unit) { vm.refreshActivation(); vm.refreshDashboard() }
    Scaffold(bottomBar = {
        NavigationBar {
            listOf("HOME" to "Home", "RIDES" to "Rides", "EARNINGS" to "Earnings", "PROFILE" to "Profile").forEach { (key, label) ->
                NavigationBarItem(selected = tab == key, onClick = { tab = key },
                    icon = { Text(label.take(1), modifier = Modifier.semantics { contentDescription = "$label tab" }) },
                    label = { Text(label) })
            }
        }
    }) { padding ->
        when (tab) {
            "RIDES" -> DriverRidesTab(vm, Modifier.padding(padding))
            "EARNINGS" -> DriverEarningsTab(vm, Modifier.padding(padding))
            "PROFILE" -> DriverProfileTab(vm, Modifier.padding(padding))
            else -> DriverHomeTab(vm, Modifier.padding(padding))
        }
    }
}

@Composable
private fun DriverHomeTab(vm: DriverAppViewModel, modifier: Modifier) {
    val dashboard by vm.dashboard.collectAsState()
    val snapshot = dashboard.snapshot
    val locationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        if (grants.values.any { it }) vm.startDuty()
    }
    LazyColumn(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text(snapshot?.let { "Good morning, ${it.name}" } ?: "OORO Driver", style = MaterialTheme.typography.headlineSmall)
            Text(snapshot?.let { "${it.onboardingStatus.replace('_', ' ')} · ${it.accountStatus.replace('_', ' ')}" } ?: "Your driver account")
            if (dashboard.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            dashboard.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { vm.refreshDashboard() }, enabled = !dashboard.loading) { Text("Refresh") }
                if (dashboard.error != null) TextButton(onClick = { vm.refreshDashboard() }) { Text("Retry") }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Text(if (dashboard.dutySession == null) "Off duty" else "On duty", style = MaterialTheme.typography.titleLarge)
                    Text(if (dashboard.dutySession == null) "Location sharing is off until you start duty." else "Location sharing is active for this duty session.")
                    if (dashboard.dutySession == null) Button(onClick = { locationLauncher.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)) }, enabled = !dashboard.loading) { Text("Start duty") }
                    else OutlinedButton(onClick = { vm.endDuty() }, enabled = !dashboard.loading) { Text("End duty") }
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Text("Vehicle and display")
                    Text(snapshot?.vehicleLabel ?: "No approved vehicle assigned")
                    Text(snapshot?.displayLabel ?: "No OORO display assigned")
                    Text("Display status: ${snapshot?.displayState ?: "Unavailable"}")
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Text("Permission diagnostics")
                    Text("Notifications: ${snapshot?.notificationState ?: "Unknown"}")
                    Text("Location: ${snapshot?.locationState ?: "Unknown"}")
                    Text("Last location: ${snapshot?.lastLocationAt ?: "Not recorded"}")
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Text("Verified advertising earnings")
                    if (snapshot == null) Text("Earnings will appear after the server confirms ledger activity.")
                    else {
                        Text("Available: ₹${snapshot.availableMinor / 100}")
                        Text("Pending: ₹${snapshot.pendingMinor / 100} · Settled: ₹${snapshot.settledMinor / 100}")
                    }
                }
            }
        }
    }
}

@Composable
private fun DriverRidesTab(vm: DriverAppViewModel, modifier: Modifier) {
    val dashboard by vm.dashboard.collectAsState()
    val rides = dashboard.snapshot?.rides.orEmpty()
    LazyColumn(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Ride activity"); Text("Only server-recorded events are shown. Unknown destinations remain unknown."); OutlinedButton(onClick = { vm.refreshDashboard() }) { Text("Refresh rides") } }
        if (rides.isEmpty()) item { Text(if (dashboard.loading) "Loading ride activity…" else "No rides recorded yet.") }
        items(rides) { ride -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(ride.provider); Text(ride.state.replace('_', ' ')); Text("${ride.verificationStatus} · ${ride.source}"); Text(ride.updatedAt.toString()) } } }
    }
}

@Composable
private fun DriverEarningsTab(vm: DriverAppViewModel, modifier: Modifier) {
    val snapshot by vm.dashboard.collectAsState()
    val data = snapshot.snapshot
    LazyColumn(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Earnings and payouts"); Text("Verified advertising ledger entries only. Provisional amounts remain pending."); OutlinedButton(onClick = { vm.refreshDashboard() }) { Text("Refresh earnings") } }
        item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Available: ${data?.let { "₹${it.availableMinor / 100}" } ?: "Not available"}"); Text("Pending: ${data?.let { "₹${it.pendingMinor / 100}" } ?: "Not available"}"); Text("Settled: ${data?.let { "₹${it.settledMinor / 100}" } ?: "Not available"}") } } }
        item { Text("Payout history") }
        if (data?.payouts.isNullOrEmpty()) item { Text("No payouts recorded.") }
        items(data?.payouts.orEmpty()) { payout -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("₹${payout.amountMinor / 100} · ${payout.status}"); Text("${payout.method} · ${payout.createdAt}") } } }
    }
}

@Composable
private fun DriverProfileTab(vm: DriverAppViewModel, modifier: Modifier) {
    val dashboard by vm.dashboard.collectAsState()
    val data = dashboard.snapshot
    Column(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(20.dp).testTag("driver-profile-screen"), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Profile")
        Text(data?.name ?: "Profile unavailable")
        Text(data?.city ?: "City not provided")
        Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Verification: ${data?.onboardingStatus ?: "Unknown"}"); Text("Beneficiary: ${data?.beneficiaryStatus ?: "Not submitted"}") } }
        Text("Permissions refresh from Android settings when the app resumes.")
        TextButton(onClick = { vm.logout() }) { Text("Log out") }
    }
}
