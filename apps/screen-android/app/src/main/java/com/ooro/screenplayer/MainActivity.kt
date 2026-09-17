@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@file:Suppress("StateFlowValueCalledInComposition")

package com.ooro.screenplayer

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.activity.result.contract.ActivityResultContracts
import androidx.media3.ui.PlayerView
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.ooro.screenplayer.kiosk.OoroDeviceAdminReceiver
import com.ooro.screenplayer.model.*
import com.ooro.screenplayer.player.Media3CreativePlayer
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style

class MainActivity : ComponentActivity() {
    private val vm: ScreenViewModel by viewModels { ScreenViewModel.factory(applicationContext) }
    private val locationPermission = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { vm.refreshLocationPermission() }
    override fun onCreate(state: android.os.Bundle?) { super.onCreate(state); window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); enterFullscreen(); OoroDeviceAdminReceiver.initialize(this,this); if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)); setContent { OoroTheme { Root(vm) } } }
    override fun onWindowFocusChanged(focus: Boolean) { super.onWindowFocusChanged(focus); if (focus) enterFullscreen() }
    private fun enterFullscreen() { WindowCompat.setDecorFitsSystemWindows(window,false); WindowInsetsControllerCompat(window, window.decorView).apply { hide(WindowInsetsCompat.Type.systemBars()); systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE } }
}

private val Yellow = Color(0xFFF5C400)
private val Panel = Color(0xFF121820)
internal fun isRepairAccessCode(value: String): Boolean = value.filter(Char::isDigit) == BuildConfig.REPAIR_ACCESS_CODE && BuildConfig.REPAIR_ACCESS_CODE.isNotBlank()
@Composable private fun OoroTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = darkColorScheme(primary = Yellow, background = Color.Black, surface = Panel), content = content)
@Composable private fun Root(vm: ScreenViewModel) { val state by vm.state.collectAsState(); var taps by remember { mutableIntStateOf(0) }; var lastTap by remember { mutableLongStateOf(0L) }; Box(Modifier.fillMaxSize()) { when (state) { ScreenState.Preparing -> Message("Preparing screen…"); is ScreenState.Setup -> { val setup = state as ScreenState.Setup; Setup(vm, setup.message, setup.repair) }; is ScreenState.AuthRecovery -> AuthRecovery(vm, state as ScreenState.AuthRecovery); is ScreenState.Player -> Player(vm, (state as ScreenState.Player).manifest); is ScreenState.Admin -> Admin(vm) }; Box(Modifier.size(96.dp).align(Alignment.TopStart).pointerInput(Unit) { detectTapGestures { val now = System.currentTimeMillis(); taps = if (now - lastTap < 2_500) taps + 1 else 1; lastTap = now; if (taps >= 7) { taps = 0; vm.showAdmin() } } }) } }
@Composable private fun Message(text: String) { Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) { Text("OORO\n$text", color = Color.White, fontSize = 28.sp) } }
@Composable private fun Setup(vm: ScreenViewModel, message: String?, repair: Boolean = false) { var code by remember { mutableStateOf("") }; val pairing by vm.pairing.collectAsState(); Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("OORO", color = Yellow, fontSize = 52.sp); Text(if (repair) "Repair this screen" else "Connect this screen", fontSize = 28.sp); Spacer(Modifier.height(16.dp)); OutlinedTextField(code, { code = it.uppercase().take(32) }, label = { Text("Pairing code") }, singleLine = true); Spacer(Modifier.height(16.dp)); Button({ vm.pair(code) }, enabled = !pairing) { Text(if (pairing) "Connecting…" else if (repair) "Complete Repair" else "Connect") }; Text(message ?: "Enter the code from the OORO workspace", color = Color.LightGray, modifier = Modifier.padding(16.dp)) } } }

@Composable private fun AuthRecovery(vm: ScreenViewModel, recovery: ScreenState.AuthRecovery) {
    var confirmRepair by remember { mutableStateOf(false) }
    val reconnecting by vm.reconnecting.collectAsState()
    val authFailure = recovery.kind !in setOf(com.ooro.screenplayer.api.DeviceFailureKind.DNS_ERROR, com.ooro.screenplayer.api.DeviceFailureKind.CONNECTION_REFUSED, com.ooro.screenplayer.api.DeviceFailureKind.TIMEOUT, com.ooro.screenplayer.api.DeviceFailureKind.TLS_ERROR, com.ooro.screenplayer.api.DeviceFailureKind.NETWORK_UNAVAILABLE, com.ooro.screenplayer.api.DeviceFailureKind.SERVER_UNAVAILABLE)
    val preservePlayback = !authFailure && recovery.cachedManifest != null
    Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
        if (preservePlayback) Player(vm, recovery.cachedManifest!!)
        Surface(color = Color(0xEE101010), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth(0.9f).padding(24.dp)) {
          Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("OORO DEVICE CONNECTION", color = Yellow, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(24.dp)); Text(if (authFailure) "Device authentication failed" else "Unable to reach OORO", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp)); Text(recovery.message, color = Color.LightGray, fontSize = 16.sp)
            Spacer(Modifier.height(24.dp)); Button(onClick = { vm.reconnect() }, enabled = !reconnecting, modifier = Modifier.fillMaxWidth()) { Text(if (reconnecting) "Reconnecting…" else if (authFailure) "Reconnect" else "Retry Connection") }
            Spacer(Modifier.height(10.dp)); OutlinedButton(onClick = { confirmRepair = true }, enabled = !reconnecting, modifier = Modifier.fillMaxWidth()) { Text("Repair Device") }
            Spacer(Modifier.height(12.dp)); Text("Reconnect keeps this device's existing identity. Repair Device should only be used if reconnect does not work.", color = Color.Gray, fontSize = 12.sp)
          }
        }
    }
    if (confirmRepair) AlertDialog(onDismissRequest = { confirmRepair = false }, title = { Text("Repair this device?") }, text = { Text("Use this if Reconnect does not work. This keeps the existing screen identity and history, and may require a new pairing code.") }, confirmButton = { TextButton(onClick = { confirmRepair = false; vm.beginRepair() }) { Text("Continue Repair") } }, dismissButton = { TextButton(onClick = { confirmRepair = false }) { Text("Cancel") } })
}

@Composable private fun Player(vm: ScreenViewModel, manifest: DeviceManifest) {
    var taps by remember { mutableIntStateOf(0) }
    val scheduledItem = vm.currentItem(manifest)
    val presentationItem by vm.currentCreative.collectAsState()
    val item = presentationItem?.takeIf { it.id == scheduledItem?.id } ?: scheduledItem
    LaunchedEffect(scheduledItem?.id) { scheduledItem?.let(vm::activatePresentation) }
    Box(Modifier.fillMaxSize().background(Color.Black).clickable { taps++; if (taps >= 7) vm.showAdmin() }) {
        if (manifest.layout == DisplayLayout.AD_NAV_OFFER || manifest.layout == DisplayLayout.FULLSCREEN_AD) Row(Modifier.fillMaxSize()) {
            Box(Modifier.weight(manifest.layoutConfig.safePrimaryWidth.toFloat())) { PrimaryAdRegion(vm, manifest, Modifier.fillMaxSize(), item) }
            Column(Modifier.weight((100 - manifest.layoutConfig.safePrimaryWidth).toFloat())) { Box(Modifier.weight(manifest.layoutConfig.safeNavigationHeight.toFloat())) { NavigationPanel(vm, Modifier.fillMaxSize()) }; Box(Modifier.weight((100 - manifest.layoutConfig.safeNavigationHeight).toFloat())) { OfferPanel(item, Modifier.fillMaxSize()) } }
        } else if (manifest.layout == DisplayLayout.SPLIT_50_25_25) Row(Modifier.fillMaxSize()) { Box(Modifier.weight(3f)) { PrimaryAdRegion(vm, manifest, Modifier.fillMaxSize(), item) }; Column(Modifier.weight(1f)) { NavigationPanel(vm, Modifier.weight(1f)); OfferPanel(item, Modifier.weight(1f)) } } else PrimaryAdRegion(vm, manifest, Modifier.fillMaxSize(), item)
    }
}

@Composable private fun PrimaryAdRegion(vm: ScreenViewModel, manifest: DeviceManifest, modifier: Modifier, selectedItem: ManifestItem? = vm.currentItem(manifest)) {
    val item = selectedItem; var path by remember(item?.id) { mutableStateOf<String?>(null) }; LaunchedEffect(item?.id) { path = item?.let { vm.localFile(it) } }
    Box(modifier.background(Color.Black), contentAlignment = Alignment.Center) {
        if (item == null || path == null) Text("OORO\nOffline — awaiting verified content", color = Color.White, fontSize = 24.sp)
        else if (item.type == CreativeType.IMAGE) { val bitmap = remember(path) { path?.let(BitmapFactory::decodeFile) }; if (bitmap != null) { LaunchedEffect(item.id) { vm.creativeStarted(item); kotlinx.coroutines.delay(item.durationSeconds * 1000L); vm.creativeFinished(item, item.durationSeconds * 1000L, true) }; Image(bitmap.asImageBitmap(), "OORO creative", Modifier.fillMaxSize(), contentScale = item.fitMode.toContentScale()) } }
        else { val context = LocalContext.current; val creative = remember(item.id) { Media3CreativePlayer(context, { vm.creativeStarted(item) }, { ms -> vm.creativeFinished(item, ms, true) }, { e -> vm.creativeFinished(item, creativeDuration(item), false, e.message) }, { }, { position -> vm.creativePosition(item, position) }) }; DisposableEffect(path) { creative.play(path!!); onDispose { if (creative.player.isPlaying) vm.creativeFinished(item, creative.player.currentPosition, false, "INTERRUPTED"); creative.close() } }; AndroidView({ PlayerView(it).apply { player = creative.player; useController = false; resizeMode = item.fitMode.toResizeMode() } }, Modifier.fillMaxSize()) }
    }
}
private fun FitMode.toContentScale() = when (this) { FitMode.FILL, FitMode.CENTER_CROP -> ContentScale.Crop; FitMode.FIT -> ContentScale.Fit }
private fun FitMode.toResizeMode() = when (this) { FitMode.FILL, FitMode.CENTER_CROP -> androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM; FitMode.FIT -> androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT }
private fun creativeDuration(item: ManifestItem) = item.durationSeconds * 1000L

@Composable private fun NavigationPanel(vm: ScreenViewModel, modifier: Modifier) { val nav by vm.navigation.collectAsState(); Column(modifier.background(Panel).padding(10.dp)) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Column { Text(if (nav.active) (nav.nextManeuver ?: "NEXT TURN") else "CURRENT LOCATION", color = Yellow, fontSize = 13.sp); Text(nav.distanceToNextManeuverMeters?.let { "${it.toInt()} m" } ?: "Live position", color = Color.White, fontSize = 22.sp) }; Text(nav.etaSeconds?.let { "ETA ${it / 60} min" } ?: "", color = Color.White, fontSize = 14.sp) }; Text(nav.nextInstruction ?: nav.destinationName ?: "Navigation route unavailable", color = Color.White, fontSize = 14.sp, maxLines = 2, modifier = Modifier.padding(vertical = 4.dp)); Box(Modifier.fillMaxWidth().weight(1f)) { MapPanel(nav, Modifier.fillMaxSize()); Text("▲", color = Yellow, fontSize = 28.sp, modifier = Modifier.align(Alignment.Center)) }; Text(if (nav.active) "${nav.remainingDistanceMeters?.div(1000.0)?.let { "%.1f km".format(it) } ?: "—"} remaining" else "GPS / map status: ${if (nav.currentLatitude != null) "LIVE" else "UNAVAILABLE"}", color = Color.LightGray, fontSize = 11.sp) } }
@Composable private fun MapPanel(nav: NavigationState, modifier: Modifier) { val context = LocalContext.current; Box(modifier.background(Color(0xFF263238))) { AndroidView(modifier = Modifier.fillMaxSize(), factory = { MapView(context).also { mapView -> mapView.onCreate(null); mapView.getMapAsync { map -> map.setStyle(Style.Builder().fromJson(OSM_STYLE)); moveMap(map, nav) } } }, update = { it.getMapAsync { map -> moveMap(map, nav) } }); if (nav.currentLatitude == null || nav.currentLongitude == null) Text("Locating…", color = Color.White, fontSize = 18.sp, modifier = Modifier.align(Alignment.Center)) } }
private fun moveMap(map: MapLibreMap, nav: NavigationState) { val lat = nav.currentLatitude ?: return; val lon = nav.currentLongitude ?: return; map.cameraPosition = CameraPosition.Builder().target(LatLng(lat, lon)).zoom(14.0).build() }
private const val OSM_STYLE = """{"version":8,"sources":{"osm":{"type":"raster","tiles":["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],"tileSize":256,"attribution":"© OpenStreetMap contributors"}},"layers":[{"id":"osm","type":"raster","source":"osm"}]}"""

@Composable private fun OfferPanel(item: ManifestItem?, modifier: Modifier) { val offer = item?.offer ?: OfferMetadata(); val qr = remember(item?.id, offer.validQrUrl) { offer.validQrUrl?.let(::qrBitmap) }; Column(modifier.background(Color(0xFF20252B)).padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(offer.brandName ?: "OORO", color = Yellow, fontSize = 17.sp, maxLines = 1); Text(offer.offerValue ?: offer.offerTitle ?: offer.ctaLabel ?: "", color = Color.White, fontSize = 24.sp, maxLines = 2); Text(offer.offerSubtitle ?: if (offer.hasOffer) "Scan to learn more" else "", color = Color.LightGray, fontSize = 12.sp, maxLines = 2, modifier = Modifier.padding(vertical = 4.dp)); if (qr != null) Image(qr.asImageBitmap(), "Offer QR code", Modifier.fillMaxWidth(0.72f).aspectRatio(1f).padding(2.dp), contentScale = ContentScale.Fit) else Spacer(Modifier.weight(1f)); offer.ctaLabel?.let { Text(it, color = Yellow, fontSize = 13.sp, maxLines = 1) } } }
private fun qrBitmap(value: String): Bitmap? = runCatching { val matrix = MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, 512, 512); Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888).also { bitmap -> for (x in 0 until 512) for (y in 0 until 512) bitmap.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE) } }.getOrNull()
@Composable private fun Admin(vm: ScreenViewModel) {
    var repairCodeDialog by remember { mutableStateOf(false) }; var repairCode by remember { mutableStateOf("") }; var repairCodeError by remember { mutableStateOf<String?>(null) }
    val d by vm.diagnostics.collectAsState(); val context = LocalContext.current; val n = networkInfo(context); val l = locationDiagnostics(context); val c = vm.deviceId
    val apiOk = d.probe?.connected == true; val issues = listOf(!apiOk, !l.permission || (!l.gps && !l.network), d.missingAssets > 0, d.proofQueued > 0).count { it }
    LazyColumn(Modifier.fillMaxSize().background(Color(0xFF101010)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text("TECHNICAL DIAGNOSTICS", color = Yellow, fontSize = 24.sp, fontWeight = FontWeight.Bold); Text("OORO SCREEN  •  $c", color = Color.LightGray); Spacer(Modifier.height(4.dp)); StatusCard("SYSTEM HEALTH", if (issues == 0) "ALL SYSTEMS OPERATIONAL" else "$issues ISSUES DETECTED", if (issues == 0) Color(0xFF63D68A) else Color(0xFFFFB74D)) }
        item { Section("OVERVIEW") { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { StatusText("DEVICE", if (vm.online) "ONLINE" else "OFFLINE", vm.online); StatusText("API", if (apiOk) "CONNECTED" else "UNREACHABLE", apiOk); StatusText("PAIRING", if (vm.isPaired) "PAIRED" else "UNPAIRED", vm.isPaired); StatusText("GPS", if (l.permission && (l.gps || l.network)) "AVAILABLE" else "SEARCHING", l.permission) } } }
        item { Section("CONNECTION") { Line("API Base URL", BuildConfig.API_BASE_URL); Line("Environment", if (BuildConfig.DEBUG) "DEBUG" else "PRODUCTION"); Line("Mock backend", if (BuildConfig.USE_MOCK_BACKEND) "ON" else "OFF"); Line("API status", if (apiOk) "CONNECTED" else "UNREACHABLE"); Line("Last successful API", relativeTime(d.apiLastSuccessAt)); d.apiLastError?.let { Text("Last API error: $it", color = Color(0xFFFFB74D), modifier = Modifier.padding(top = 4.dp)) }; Text("DNS ${passFail(d.probe?.dns)}   TCP ${passFail(d.probe?.tcp)}   ${d.probe?.httpStatus?.let { "HTTP $it" } ?: "HTTP —"}   ${d.probe?.latencyMs?.let { "${it} ms" } ?: ""}", color = Color.LightGray); d.probe?.failureKind?.let { Text("Diagnostic: $it", color = Color(0xFFFFB74D), fontSize = 12.sp) }; Button({ vm.runDiagnostics() }, enabled = !d.running, modifier = Modifier.padding(top = 6.dp)) { Text(if (d.running) "RUNNING…" else "TEST API CONNECTION") } } }
        item { Section("NETWORK") { Line("Connection type", n.type); Line("Internet", if (n.internet) "AVAILABLE" else "UNAVAILABLE"); Line("Local network", if (n.localNetwork) "AVAILABLE" else "UNAVAILABLE"); Line("Device IP", n.ip ?: "unavailable"); Line("API host reachable", if (apiOk) "YES" else "NO") } }
        item { Section("GPS") { Line("Location permission", if (l.permission) "GRANTED" else "DENIED"); Line("GPS provider", if (l.gps) "ENABLED" else "DISABLED"); Line("Network provider", if (l.network) "ENABLED" else "DISABLED"); Line("Last location", relativeTime(vm.latestLocation.value?.occurredAt)); Line("Accuracy", vm.latestLocation.value?.accuracyMeters?.let { "%.0f m".format(it) } ?: "unavailable"); Line("Attached to heartbeat", if (vm.latestLocation.value != null) "YES" else "NO") } }
        item { Section("HEARTBEAT") { Line("Last attempted", relativeTime(d.heartbeatLastAttemptAt)); Line("Last successful", relativeTime(d.heartbeatLastSuccessAt)); Line("Last HTTP status", d.heartbeatStatus?.toString() ?: "—"); Line("GPS attached", if (vm.latestLocation.value != null) "YES" else "NO"); Line("Playback attached", if (vm.currentCreative.value != null) "YES" else "NO"); d.heartbeatError?.let { Text(it, color = Color(0xFFFFB74D)) } } }
        item { Section("PAIRING") { Line("Paired", if (vm.isPaired) "YES" else "NO"); Line("Screen ID", vm.screenId); Line("Device credential", "SECURELY STORED"); Text("Repair requires the OORO technician code, then uses the existing pairing flow.", color = Color.LightGray, fontSize = 12.sp); Button({ repairCode = ""; repairCodeError = null; repairCodeDialog = true }) { Text("REPAIR SCREEN") } } }
        item { Section("MANIFEST & ASSETS") { Line("Manifest version", vm.manifestVersion); Line("Last sync", relativeTime(d.manifestLastSyncAt)); Line("Cached assets", "${d.verifiedAssets}/${d.verifiedAssets + d.missingAssets}"); Line("LKG available", if (d.manifestLastSyncAt != null) "YES" else "NO"); Button({ vm.runDiagnostics() }) { Text("VERIFY ASSETS") } } }
        item { Section("PLAYER & PROOF DELIVERY") { Line("Player state", if (vm.currentCreative.value != null) "PLAYING" else "IDLE"); Line("Current creative", vm.currentCreative.value?.creativeId ?: "—"); Line("Queued proof events", d.proofQueued.toString()); Line("Proof delivery", if (d.proofQueued == 0) "UPLOADED / EMPTY" else "WAITING FOR NETWORK"); Button({ vm.retryQueue() }, enabled = d.proofQueued > 0) { Text("RETRY QUEUE") } } }
        item { Section("AUTO-DIAGNOSIS") { Text(d.lastDiagnosis ?: "Run full diagnostic", color = if (issues == 0) Color(0xFF63D68A) else Color(0xFFFFB74D), fontSize = 16.sp); Text("Heartbeat and manifest checks use the existing safe APIs; no playback or proof events are fabricated.", color = Color.LightGray, fontSize = 12.sp) } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button({ vm.runDiagnostics() }) { Text("RUN FULL DIAGNOSTIC") }; OutlinedButton({ val clip = android.content.ClipData.newPlainText("OORO diagnostic", vm.diagnosticReport()); context.getSystemService(android.content.ClipboardManager::class.java)?.setPrimaryClip(clip) }) { Text("COPY REPORT") }; TextButton({ vm.closeAdmin() }) { Text("CLOSE") } } }
    }
    if (repairCodeDialog) AlertDialog(
        onDismissRequest = { repairCodeDialog = false },
        title = { Text("Repair screen") },
        text = { Column { Text("Enter the OORO technician code to continue repair."); Spacer(Modifier.height(12.dp)); OutlinedTextField(repairCode, { repairCode = it.take(32); repairCodeError = null }, label = { Text("OORO code") }, singleLine = true, isError = repairCodeError != null); repairCodeError?.let { Text(it, color = Color(0xFFFF6B6B), fontSize = 12.sp) } } },
        confirmButton = { TextButton(onClick = { if (isRepairAccessCode(repairCode)) { repairCodeDialog = false; vm.beginRepair() } else repairCodeError = "Incorrect OORO technician code." }) { Text("Continue") } },
        dismissButton = { TextButton(onClick = { repairCodeDialog = false }) { Text("Cancel") } }
    )
}
@Composable private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) { Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp), content = { Text(title, color = Yellow, fontSize = 13.sp, fontWeight = FontWeight.Bold); Spacer(Modifier.height(6.dp)); content() }) } }
@Composable private fun StatusCard(title: String, value: String, color: Color) { Card(colors = CardDefaults.cardColors(containerColor = Panel), modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Text(title, color = Yellow, fontSize = 12.sp); Text(value, color = color, fontSize = 20.sp, fontWeight = FontWeight.Bold) } } }
@Composable private fun Line(label: String, value: String) { Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = Color.LightGray, fontSize = 13.sp); Text(value, color = Color.White, fontSize = 13.sp) } }
@Composable private fun StatusText(label: String, value: String, ok: Boolean) { Column { Text(label, color = Color.Gray, fontSize = 10.sp); Text(value, color = if (ok) Color(0xFF63D68A) else Color(0xFFFFB74D), fontSize = 12.sp) } }
private fun passFail(value: Boolean?) = when (value) { true -> "PASS"; false -> "FAIL"; null -> "N/A" }
