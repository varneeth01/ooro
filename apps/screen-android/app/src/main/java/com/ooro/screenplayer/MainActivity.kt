package com.ooro.screenplayer

import android.app.Activity
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.*

class MainActivity : ComponentActivity() {
    private val viewModel: ScreenViewModel by viewModels { ScreenViewModel.factory(applicationContext) }
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); enterFullscreen(); setContent { OoroTheme { ScreenRoot(viewModel) } } }
    override fun onWindowFocusChanged(hasFocus: Boolean) { super.onWindowFocusChanged(hasFocus); if (hasFocus) enterFullscreen() }
    private fun enterFullscreen() { WindowCompat.setDecorFitsSystemWindows(window, false); WindowInsetsControllerCompat(window, window.decorView).let { it.hide(WindowInsetsCompat.Type.systemBars()); it.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE } }
}

private val OoroYellow = Color(0xFFF5C400)
private val OoroBlack = Color(0xFF080808)
@Composable private fun OoroTheme(content: @Composable () -> Unit) { MaterialTheme(colorScheme = darkColorScheme(primary = OoroYellow, background = OoroBlack, surface = Color(0xFF171717)), content = content) }

@Composable private fun ScreenRoot(vm: ScreenViewModel) {
    val state by vm.state.collectAsState()
    when (state) { is ScreenState.Setup -> SetupScreen(vm, (state as ScreenState.Setup).message); is ScreenState.Player -> PlayerScreen(vm, (state as ScreenState.Player).manifest); ScreenState.Preparing -> PreparingScreen() }
}
@Composable private fun SetupScreen(vm: ScreenViewModel, message: String?) { var code by remember { mutableStateOf("") }; var taps by remember { mutableIntStateOf(0) }; Box(Modifier.fillMaxSize().background(OoroBlack), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) { Text("OORO", color = OoroYellow, fontSize = 42.sp, modifier = Modifier.clickable { taps++; if (taps >= 7) vm.showAdmin() }); Spacer(Modifier.height(22.dp)); Text("Connect this screen", fontSize = 30.sp); Spacer(Modifier.height(10.dp)); Text("Enter the setup code shown in your OORO workspace.", color = Color.LightGray); Spacer(Modifier.height(28.dp)); OutlinedTextField(value = code, onValueChange = { code = it.uppercase().take(12) }, label = { Text("Setup code") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii)); Spacer(Modifier.height(16.dp)); Button(onClick = { vm.pair(code) }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = OoroYellow, contentColor = Color.Black)) { Text("Connect screen") }; Spacer(Modifier.height(24.dp)); Text(message ?: "Network: ${if (vm.online) "Online" else "Offline"}", color = if (message == null) Color.Gray else OoroYellow, fontSize = 14.sp); Spacer(Modifier.height(22.dp)); Text("Device ID: ${vm.deviceId.takeLast(12)}", color = Color.Gray, fontSize = 12.sp) } } }
@Composable private fun PreparingScreen() { Box(Modifier.fillMaxSize().background(OoroBlack), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("OORO", color = OoroYellow, fontSize = 44.sp); Spacer(Modifier.height(14.dp)); Text("Preparing screen…", color = Color.White) } } }
@Composable private fun PlayerScreen(vm: ScreenViewModel, manifest: DeviceManifest) { Box(Modifier.fillMaxSize().background(Color.Black).clickable { vm.adminTaps++ }) { val item = vm.currentItem(manifest); if (item == null) { Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) { Text("OORO", color = OoroYellow, fontSize = 60.sp); Text("Smart screens. Real impact.", color = Color.White, fontSize = 20.sp) } } else { Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) { Text("OORO DEMO", color = OoroYellow, fontSize = 54.sp); Text("${item.campaignId} · ${item.type.name}", color = Color.White, fontSize = 24.sp) } } } }
