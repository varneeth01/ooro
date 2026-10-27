package com.ooro.driver

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner

private val Lime = Color(0xFFDFFF00)
private val Ink = Color(0xFF101411)
private val Paper = Color(0xFFF5F6F1)
private val Muted = Color(0xFF626A61)

@Composable
private fun DriverShell(eyebrow: String, title: String, caption: String, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxSize().background(Paper).verticalScroll(rememberScrollState()).imePadding().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(52.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).background(Lime, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Text("∞", fontSize = 30.sp, color = Ink, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(10.dp))
            Text("OORO DRIVER", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Ink, letterSpacing = 1.sp)
        }
        Spacer(Modifier.height(44.dp))
        Text(eyebrow.uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
        Spacer(Modifier.height(10.dp))
        Text(title, fontSize = 34.sp, lineHeight = 39.sp, color = Ink, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        Text(caption, fontSize = 15.sp, lineHeight = 23.sp, color = Muted)
        Spacer(Modifier.height(28.dp))
        content()
        Spacer(Modifier.height(42.dp))
    }
}
@Composable
private fun PrimaryDriverButton(label: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = enabled, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = RoundedCornerShape(15.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Ink, contentColor = Color.White)) {
        Text(label, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
    }
}
@Composable
fun DriverWelcomeScreen(vm: DriverAppViewModel, mode: AppMode) {
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    val message by vm.message.collectAsState()
    DriverShell("Your next ride starts here", if (mode == AppMode.LOGIN) "Drive with confidence." else "Verify your number.",
        if (mode == AppMode.LOGIN) "Connect your eligible rides and OORO display. Track verified activity and available earnings in one place."
        else "Enter the one-time code sent to your phone. Your driver account stays protected.") {
        Surface(color = Color.White, shape = RoundedCornerShape(20.dp), tonalElevation = 1.dp) {
            Column(Modifier.padding(20.dp)) {
                if (mode == AppMode.LOGIN) {
                    Text("Mobile number", fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(value = phone, onValueChange = { phone = it.filter(Char::isDigit).take(10) },
                        placeholder = { Text("10-digit mobile number") }, leadingIcon = { Text("+91") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), singleLine = true,
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                    Spacer(Modifier.height(18.dp))
                    PrimaryDriverButton("Continue securely", phone.length == 10) { vm.requestOtp(phone) }
                } else {
                    Text("Verification code", fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(value = otp, onValueChange = { otp = it.filter(Char::isDigit).take(6) },
                        placeholder = { Text("6-digit code") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                    Spacer(Modifier.height(18.dp))
                    PrimaryDriverButton("Verify & continue", otp.length == 6) { vm.verifyOtp(otp) }
                }
            }
        }
        if (message != null) {
            Spacer(Modifier.height(16.dp))
            Text(message ?: "", color = Color(0xFF9B2020), fontSize = 14.sp)
        }
        Spacer(Modifier.height(22.dp))
        Text("Your information is used for driver verification and ride-related operations only. Notification access and location permissions are optional until you explicitly enable them.", color = Muted, fontSize = 13.sp, lineHeight = 20.sp)
    }
}
@Composable
fun DriverPermissionsScreen(vm: DriverAppViewModel) {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    var revision by remember { mutableIntStateOf(0) }
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_RESUME) revision++ }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    val notificationGranted = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    val locationGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val listenerGranted = NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { revision++ }
    DriverShell("Step 7 of 9 · Your choice", "Connect your ride tools.",
        "OORO can recognize supported ride notifications and use foreground location to help verify trips. You stay in control of these permissions.") {
        PermissionCard("Ride notifications", if (listenerGranted) "Connected" else "Not connected",
            "Read selected mobility-app notifications. OORO cannot accept or cancel rides.", listenerGranted,
            "Open notification access") { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        Spacer(Modifier.height(12.dp))
        PermissionCard("Foreground location", if (locationGranted) "Allowed" else "Not allowed",
            "Used to support ride verification while you're on duty. Background location requires a separate explicit decision.", locationGranted,
            "Allow while using app") {
            launcher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
        Spacer(Modifier.height(12.dp))
        PermissionCard("Status notifications", if (notificationGranted) "Allowed" else "Not allowed",
            "Shows service and ride-status notifications while the app is operating.", notificationGranted,
            "Allow notifications") {
            if (Build.VERSION.SDK_INT >= 33) launcher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
        }
        Spacer(Modifier.height(24.dp))
        Text("Settings are checked again when you return. OORO never enables access silently.", fontSize = 13.sp, color = Muted)
        Spacer(Modifier.height(14.dp))
        PrimaryDriverButton("Continue to payment setup") { vm.advance(OnboardingStep.PAYMENT) }
        Spacer(Modifier.height(8.dp))
        Text("You can continue without granting access, but ride detection and location verification will remain unavailable until enabled.", fontSize = 12.sp, lineHeight = 19.sp, color = Muted)
    }
}
@Composable
private fun PermissionCard(title: String, status: String, detail: String, enabled: Boolean, action: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(18.dp), color = Color.White) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, modifier = Modifier.weight(1f), fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                Text(status, fontSize = 12.sp, color = if (enabled) Color(0xFF246A3F) else Muted, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(9.dp))
            Text(detail, fontSize = 13.sp, lineHeight = 20.sp, color = Muted)
            if (!enabled) {
                Spacer(Modifier.height(14.dp))
                OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), shape = RoundedCornerShape(12.dp)) { Text(action) }
            }
        }
    }
}
