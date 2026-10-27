package com.ooro.driver

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SafePairDisplayStep(vm: DriverAppViewModel) {
    var code by remember { mutableStateOf("") }
    val dashboard by vm.dashboard.collectAsState()
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Connect an OORO display")
        Text("Pair a display assigned to your approved vehicle. You can continue without pairing if your fleet operator will complete this step.")
        OutlinedTextField(
            value = code,
            onValueChange = { code = it.take(32) },
            label = { Text("Display pairing code") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Button(onClick = { vm.pairDisplay(code) }, enabled = code.isNotBlank() && dashboard.loading.not()) {
            Text("Connect display")
        }
        OutlinedButton(onClick = { vm.advance(OnboardingStep.PERMISSIONS) }, modifier = Modifier.fillMaxWidth()) {
            Text("Continue without pairing")
        }
        Spacer(Modifier.height(8.dp))
        Text("A display is only paired after the backend confirms the vehicle assignment and pairing code.")
    }
}
