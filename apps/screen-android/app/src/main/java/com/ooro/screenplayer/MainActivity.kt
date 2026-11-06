@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@file:Suppress("StateFlowValueCalledInComposition")

package com.ooro.screenplayer

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.util.LruCache
import android.os.SystemClock
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.graphicsLayer
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.activity.result.contract.ActivityResultContracts
import androidx.media3.ui.PlayerView
import android.util.Log
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter
import com.ooro.screenplayer.kiosk.OoroDeviceAdminReceiver
import com.ooro.screenplayer.model.*
import com.ooro.screenplayer.player.Media3CreativePlayer
import com.ooro.screenplayer.player.CreativeScaleBehavior
import com.ooro.screenplayer.player.creativeScaleBehavior
import com.ooro.screenplayer.player.decodeCreativeImage
import com.ooro.screenplayer.player.fittedContentBounds
import com.ooro.screenplayer.player.usesSidebar80
import com.ooro.screenplayer.player.usesSponsoredLayout
import com.ooro.screenplayer.player.shouldRenderNewsTicker
import com.ooro.screenplayer.player.PresentationPreference
import com.ooro.screenplayer.player.PresentationPreferenceStore
import com.ooro.screenplayer.player.geometryContractVersion
import org.maplibre.android.annotations.Marker
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.tile.TileOperation
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style
import kotlinx.coroutines.flow.flowOf
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.io.File

class MainActivity : ComponentActivity() {
    private val vm: ScreenViewModel by viewModels { ScreenViewModel.factory(applicationContext) }
    private var locationPermissionGranted by mutableStateOf(false)
    private var locationPermissionMessage by mutableStateOf<String?>(null)
    private var locationPermissionState by mutableStateOf(OptionalLocationState.DENIED)
    private val locationPermissionRequestGate = LocationPermissionRequestGate()
    private lateinit var permissionHistory: LocationPermissionHistory
    private lateinit var presentationPreferenceStore: PresentationPreferenceStore
    private var presentationPreference by mutableStateOf(PresentationPreference.AUTO_FROM_MANIFEST)
    private val locationPermission = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        locationPermissionRequestGate.complete()
        if (result.values.any { it }) permissionHistory.recordGranted() else permissionHistory.recordDenied()
        refreshLocationState()
        locationPermissionMessage = if (locationPermissionGranted) "Location access enabled for location-based features."
        else "Location was not allowed. Pairing and playback still work; live location features are unavailable."
        if (locationPermissionGranted) vm.refreshLocationPermission()
        Log.i("OoroPermission", "optional_location_result state=${locationPermissionState.name}")
    }
    override fun onCreate(state: android.os.Bundle?) {
        super.onCreate(state)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterFullscreen()
        OoroDeviceAdminReceiver.initialize(this, this)
        permissionHistory = LocationPermissionHistory(this)
        refreshLocationState()
        presentationPreferenceStore = PresentationPreferenceStore(this)
        presentationPreference = presentationPreferenceStore.read()
        setContent {
            OoroTheme {
                Root(vm, locationPermissionGranted, locationPermissionMessage, locationPermissionState, ::requestLocationPermission, ::openAppSettings, presentationPreference) { selected ->
                    presentationPreferenceStore.write(selected)
                    presentationPreference = selected
                }
            }
        }
    }
    override fun onResume() {
        super.onResume()
        if (::permissionHistory.isInitialized) {
            val previous = locationPermissionGranted
            refreshLocationState()
            if (previous != locationPermissionGranted) {
                locationPermissionMessage = "Location access updated from Android settings."
                vm.refreshLocationPermission()
            }
        }
    }
    private fun hasLocationPermission() = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    private fun refreshLocationState() {
        locationPermissionGranted = hasLocationPermission()
        if (locationPermissionGranted && ::permissionHistory.isInitialized) permissionHistory.recordGranted()
        val available = packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS) || packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION_NETWORK)
        locationPermissionState = optionalLocationState(
            granted = locationPermissionGranted,
            locationFeatureAvailable = available,
            requestAttempts = if (::permissionHistory.isInitialized) permissionHistory.attempts else 0,
            userDeniedBefore = ::permissionHistory.isInitialized && permissionHistory.wasDenied,
            shouldShowRationale = shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) || shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_COARSE_LOCATION),
            wasGrantedBefore = ::permissionHistory.isInitialized && permissionHistory.wasGranted
        )
    }
    private fun requestLocationPermission() {
        refreshLocationState()
        when (locationPermissionState) {
            OptionalLocationState.GRANTED -> locationPermissionMessage = "Location access is already enabled."
            OptionalLocationState.UNAVAILABLE -> locationPermissionMessage = "This device does not provide a supported location provider."
            OptionalLocationState.PERMANENTLY_DENIED -> locationPermissionMessage = "Android will not show another permission prompt. Open app settings to change location access."
            OptionalLocationState.NOT_REQUESTED, OptionalLocationState.DENIED -> {
                if (!locationPermissionRequestGate.tryBegin()) return
                permissionHistory.recordRequest()
                Log.i("OoroPermission", "optional_location_request source=technician_settings")
                runCatching { locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) }
                    .onFailure { locationPermissionRequestGate.complete(); Log.w("OoroPermission", "optional_location_request_launch_failed", it) }
            }
        }
    }
    private fun openAppSettings() {
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
    }
    override fun onWindowFocusChanged(focus: Boolean) { super.onWindowFocusChanged(focus); if (focus) enterFullscreen() }
    private fun enterFullscreen() { WindowCompat.setDecorFitsSystemWindows(window,false); WindowInsetsControllerCompat(window, window.decorView).apply { hide(WindowInsetsCompat.Type.systemBars()); systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE } }
}

private val Yellow = Color(0xFFF5C400)
private val Panel = Color(0xFF141A20)
private val PanelRaised = Color(0xFF1A222A)
private val Muted = Color(0xFFAAB4BE)
internal data class PlayerPreviewConfig(
    val itemId: String,
    val assetPaths: Map<String, String>,
    val sponsoredItemId: String? = null,
    val sponsoredAssetPath: String? = null,
    val navigation: NavigationState = NavigationState(),
    val onMapHealth: (Boolean, String?) -> Unit = { _, _ -> }
)
internal fun backendEnvironment(): String = when {
    BuildConfig.USE_MOCK_BACKEND -> "LOCAL MOCK"
    BuildConfig.API_BASE_URL.startsWith("http://127.0.0.1") || BuildConfig.API_BASE_URL.startsWith("http://localhost") -> "LOCAL TEST BACKEND"
    BuildConfig.API_BASE_URL.contains("staging", ignoreCase = true) -> "STAGING"
    BuildConfig.API_BASE_URL.startsWith("https://") -> "PRODUCTION"
    else -> "UNKNOWN"
}
internal fun isRepairAccessCode(value: String, configuredCode: String = BuildConfig.REPAIR_ACCESS_CODE): Boolean = value.filter(Char::isDigit) == configuredCode && configuredCode.isNotBlank()
internal fun locationPermissionStatus(granted: Boolean, fixAvailable: Boolean): String = when {
    !granted -> "Not granted · live location features unavailable"
    fixAvailable -> "Available"
    else -> "Granted · waiting for location fix"
}
@Composable private fun OoroTheme(content: @Composable () -> Unit) = MaterialTheme(
    colorScheme = darkColorScheme(primary = Yellow, onPrimary = Color(0xFF111316), background = Color(0xFF080A0D), onBackground = Color.White, surface = Panel, onSurface = Color.White, surfaceVariant = PanelRaised, onSurfaceVariant = Muted),
    content = content
)
@Composable private fun Root(vm: ScreenViewModel, locationGranted: Boolean, locationMessage: String?, locationState: OptionalLocationState, onRequestLocation: () -> Unit, onOpenAppSettings: () -> Unit, presentationPreference: PresentationPreference, onPresentationPreferenceChanged: (PresentationPreference) -> Unit) { SideEffect { RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.ROOT_COMPOSITION) }; val state by vm.state.collectAsState(); var taps by remember { mutableIntStateOf(0) }; var lastTap by remember { mutableLongStateOf(0L) }; Box(Modifier.fillMaxSize()) { when (state) { ScreenState.Preparing -> Message("Preparing screen…"); is ScreenState.Setup -> { val setup = state as ScreenState.Setup; Setup(vm, setup.message, setup.repair, locationGranted, locationMessage) }; is ScreenState.AuthRecovery -> AuthRecovery(vm, state as ScreenState.AuthRecovery, presentationPreference); is ScreenState.Player -> Player(vm, (state as ScreenState.Player).manifest, presentationPreference = presentationPreference); is ScreenState.Admin -> Admin(vm, (state as ScreenState.Admin).manifest, locationGranted, locationState, locationMessage, onRequestLocation, onOpenAppSettings, presentationPreference, onPresentationPreferenceChanged) }; Box(Modifier.size(96.dp).align(Alignment.TopStart).pointerInput(Unit) { detectTapGestures { val now = System.currentTimeMillis(); taps = if (now - lastTap < 2_500) taps + 1 else 1; lastTap = now; if (taps >= 7) { taps = 0; vm.showAdmin() } } }) } }
@Composable private fun Message(text: String) { Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) { Text("OORO\n$text", color = Color.White, fontSize = 28.sp) } }
@Composable private fun Setup(vm: ScreenViewModel, message: String?, repair: Boolean = false, locationGranted: Boolean, locationMessage: String?) {
    var code by remember { mutableStateOf("") }
    val pairing by vm.pairing.collectAsState()
    BoxWithConstraints(Modifier.fillMaxSize().background(Color(0xFF080A0D)).padding(24.dp)) {
        val wide = maxWidth >= 760.dp
        if (wide) Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(32.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f).padding(start = 24.dp, end = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.width(5.dp).height(42.dp).clip(RoundedCornerShape(3.dp)).background(Yellow))
                    Column {
                        Text("OORO", color = Yellow, fontSize = 31.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
                        Text("DISPLAYOS  /  SCREEN PLAYER", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    }
                }
                Spacer(Modifier.height(34.dp))
                StatusChip(if (repair) "AUTHORIZED REPAIR" else "FIRST-TIME SETUP", if (repair) Color(0xFFFFC46B) else Yellow)
                Spacer(Modifier.height(14.dp))
                Text(if (repair) "Restore this display" else "Bring this screen online", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold, lineHeight = 36.sp)
                Text("Connect this player to the screen already registered in your OORO workspace.", color = Muted, fontSize = 16.sp, lineHeight = 23.sp, modifier = Modifier.padding(top = 9.dp))
                Spacer(Modifier.height(25.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    SetupStep("01", "One-time code")
                    SetupStep("02", "Secure pairing")
                    SetupStep("03", "Content sync")
                }
                Spacer(Modifier.height(24.dp))
                Text("Location is optional and only used for live location reporting. Pairing and advertising playback work without it; no permission prompt appears during setup.", color = Muted, fontSize = 12.sp, lineHeight = 18.sp)
                if (locationGranted) Text(locationMessage ?: "Optional location access is enabled.", color = Color(0xFF7CE0A2), fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }
            TechnicianCard(Modifier.weight(1f).padding(end = 24.dp), containerColor = Panel) {
                Text("PAIR A DISPLAY", color = Yellow, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                Text("Use an authorized one-time code", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 5.dp))
                Text("Request a code from your OORO administrator. This screen keeps its registered identity after pairing.", color = Muted, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp))
                OutlinedTextField(code, { code = it.uppercase().filter { ch -> ch.isLetterOrDigit() || ch == '-' }.take(32) }, label = { Text("One-time pairing code") }, singleLine = true, modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp).semantics { contentDescription = "One-time pairing code" }, enabled = !pairing)
                message?.let { SetupMessage(it) }
                Button({ vm.pair(code) }, enabled = !pairing && code.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp).padding(top = 12.dp)) { Text(if (pairing) "CONNECTING…" else if (repair) "CONTINUE REPAIR" else "CONNECT DISPLAY") }
                Text("Pairing does not grant optional location access.", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 12.dp))
            }
        } else Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.Center) {
            Text("OORO", color = Yellow, fontSize = 42.sp, fontWeight = FontWeight.Bold)
            Text(if (repair) "Repair this screen" else "Connect your display", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
            Text("Location is optional. Pairing and advertising playback work without it.", color = Color(0xFFB6C0CA), fontSize = 13.sp, modifier = Modifier.padding(vertical = 12.dp))
            TechnicianCard {
                OutlinedTextField(code, { code = it.uppercase().take(32) }, label = { Text("Pairing code") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = !pairing)
                message?.let { Text(it, color = Color(0xFFFFC46B), fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
                Button({ vm.pair(code) }, enabled = !pairing && code.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text(if (pairing) "CONNECTING…" else "CONNECT") }
            }
        }
    }
}

@Composable private fun AuthRecovery(vm: ScreenViewModel, recovery: ScreenState.AuthRecovery, presentationPreference: PresentationPreference) {
    var confirmRepair by remember { mutableStateOf(false) }
    val reconnecting by vm.reconnecting.collectAsState()
    val authFailure = recovery.kind !in setOf(com.ooro.screenplayer.api.DeviceFailureKind.DNS_ERROR, com.ooro.screenplayer.api.DeviceFailureKind.CONNECTION_REFUSED, com.ooro.screenplayer.api.DeviceFailureKind.TIMEOUT, com.ooro.screenplayer.api.DeviceFailureKind.TLS_ERROR, com.ooro.screenplayer.api.DeviceFailureKind.NETWORK_UNAVAILABLE, com.ooro.screenplayer.api.DeviceFailureKind.SERVER_UNAVAILABLE)
    val preservePlayback = !authFailure && recovery.cachedManifest != null
    BoxWithConstraints(Modifier.fillMaxSize().background(Color(0xFF080A0D)).padding(24.dp), contentAlignment = Alignment.Center) {
        if (preservePlayback) Player(vm, recovery.cachedManifest!!, presentationPreference = presentationPreference)
        val intro: @Composable ColumnScope.() -> Unit = {
                Text("OORO  /  DISPLAYOS", color = Yellow, fontSize = 19.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Spacer(Modifier.height(20.dp))
                StatusChip(if (authFailure) "ACTION REQUIRED" else "CONNECTION INTERRUPTED", if (authFailure) Color(0xFFFF7373) else Color(0xFFFFC46B))
                Text(if (authFailure) "Reconnect this display" else "Your screen is offline", color = Color.White, fontSize = 31.sp, fontWeight = FontWeight.Bold, lineHeight = 38.sp, modifier = Modifier.padding(top = 14.dp))
                Text(recovery.message, color = Muted, fontSize = 15.sp, lineHeight = 22.sp, modifier = Modifier.padding(top = 8.dp))
                if (recovery.cachedManifest != null) Text("Cached playback remains available while its authorization is valid.", color = Color(0xFF7CE0A2), fontSize = 13.sp, modifier = Modifier.padding(top = 16.dp))
        }
        val actions: @Composable ColumnScope.() -> Unit = {
                Text(if (authFailure) "DEVICE ACCESS" else "NETWORK RECOVERY", color = Yellow, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(if (authFailure) "Reconnect first" else "Retry when ready", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 6.dp))
                Text("Reconnect preserves this display identity. Repair is a separate, authorized action.", color = Muted, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 5.dp, bottom = 14.dp))
                Button(onClick = { vm.reconnect() }, enabled = !reconnecting, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text(if (reconnecting) "RECONNECTING…" else "RETRY CONNECTION") }
                OutlinedButton(onClick = { confirmRepair = true }, enabled = !reconnecting, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp).padding(top = 7.dp)) { Text("AUTHORIZED REPAIR…") }
        }
        if (maxWidth >= 760.dp) {
            Row(Modifier.fillMaxWidth().widthIn(max = 1040.dp), horizontalArrangement = Arrangement.spacedBy(26.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(0.85f), content = intro)
                TechnicianCard(Modifier.weight(1f), containerColor = Panel, content = actions)
            }
        } else {
            Column(Modifier.fillMaxWidth().widthIn(max = 560.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(22.dp)) {
                Column(content = intro)
                TechnicianCard(containerColor = Panel, content = actions)
            }
        }
    }
    if (confirmRepair) AlertDialog(onDismissRequest = { confirmRepair = false }, title = { Text("Repair this device?") }, text = { Text("Use this if Reconnect does not work. This keeps the existing screen identity and history, and may require a new pairing code.") }, confirmButton = { TextButton(onClick = { confirmRepair = false; vm.beginRepair() }) { Text("Continue Repair") } }, dismissButton = { TextButton(onClick = { confirmRepair = false }) { Text("Cancel") } })
}

@Composable internal fun Player(vm: ScreenViewModel?, manifest: DeviceManifest, preview: PlayerPreviewConfig? = null, presentationPreference: PresentationPreference = PresentationPreference.AUTO_FROM_MANIFEST) {
    var taps by remember { mutableIntStateOf(0) }
    val playbackOffset by (vm?.playbackOffset ?: flowOf(0)).collectAsState(initial = 0)
    val presentationItem by (vm?.currentCreative ?: flowOf<ManifestItem?>(null)).collectAsState(initial = null)
    val previewVerifiedIds = remember(preview?.sponsoredItemId) { setOfNotNull(preview?.sponsoredItemId) }
    val verifiedAssetFlow = vm?.verifiedAssetIds ?: remember(previewVerifiedIds) { flowOf(previewVerifiedIds) }
    val verifiedAssetIds by verifiedAssetFlow.collectAsState(initial = previewVerifiedIds)
    var manifestExpired by remember(manifest.version, manifest.validUntil) {
        mutableStateOf(!manifestIsAuthorizedAt(manifest, Instant.now()))
    }
    LaunchedEffect(manifest.version, manifest.validUntil) {
        val expiresAt = manifest.validUntil
        if (expiresAt == null) {
            manifestExpired = true
        } else {
            val remainingMs = Duration.between(Instant.now(), expiresAt).toMillis()
            if (remainingMs <= 0) manifestExpired = true
            else { kotlinx.coroutines.delay(remainingMs); manifestExpired = true }
        }
    }
    val scheduledItem = remember(manifest, playbackOffset, verifiedAssetIds, manifestExpired, vm) {
        if (manifestExpired) null else vm?.currentItem(manifest, playbackOffset, verifiedAssetIds)
    }
    val sponsorCandidate = manifest.sponsoredItem?.takeIf { !manifestExpired && it.id in verifiedAssetIds && it.type == CreativeType.IMAGE }
    var sponsorClock by remember(manifest.version) { mutableStateOf(Instant.now()) }
    LaunchedEffect(sponsorCandidate?.id, sponsorCandidate?.startAt, sponsorCandidate?.endAt, sponsorCandidate?.daysOfWeek, sponsorCandidate?.startTime, sponsorCandidate?.endTime, manifest.timezone) {
        sponsorClock = Instant.now()
        val item = sponsorCandidate ?: return@LaunchedEffect
        val zone = runCatching { ZoneId.of(manifest.timezone) }.getOrDefault(ZoneId.of(BuildConfig.DEFAULT_TIMEZONE))
        while (true) {
            val boundary = nextScheduleBoundary(item, sponsorClock, zone) ?: return@LaunchedEffect
            kotlinx.coroutines.delay(Duration.between(sponsorClock, boundary).toMillis().coerceAtLeast(1L))
            sponsorClock = Instant.now()
        }
    }
    val sponsoredItem = remember(sponsorCandidate, sponsorClock, verifiedAssetIds, manifest.layoutContractVersion, manifest.validUntil) { eligibleSponsoredItem(manifest, sponsorClock, verifiedAssetIds) }
    // The local setting affects presentation geometry only. Sponsor eligibility, lease,
    // schedules, selection and proof attribution continue to use the unmodified manifest.
    val geometryVersion = geometryContractVersion(manifest.layoutContractVersion, manifest.layout, presentationPreference)
    val item = preview?.let { state ->
        val zone = runCatching { ZoneId.of(manifest.timezone) }.getOrDefault(ZoneId.of(BuildConfig.DEFAULT_TIMEZONE))
        manifest.items.firstOrNull { it.id == state.itemId && it.isActive(Instant.now(), zone) }
    } ?: scheduledItem
    val displayedOffer = if (preview != null) item else if (manifestExpired) null else presentationItem ?: item
    val rootModifier = if (preview == null) Modifier.fillMaxSize().background(Color.Black).clickable {
        taps++
        if (taps >= 7) { taps = 0; vm?.showAdmin() }
    } else Modifier.fillMaxSize().background(Color.Black).clipToBounds()
    Box(rootModifier) {
        if (manifest.layout == DisplayLayout.FOUR_ZONE || manifest.layout == DisplayLayout.AD_NAV_OFFER) Row(Modifier.fillMaxSize().clipToBounds()) {
            val adWidth = if (usesSidebar80(manifest.layout, geometryVersion)) 80 else manifest.layoutConfig.safePrimaryWidth
            val sidebarSplit = if (usesSidebar80(manifest.layout, geometryVersion)) 50 else manifest.layoutConfig.safeQrHeight
            Column(Modifier.weight(adWidth.toFloat()).fillMaxHeight().clipToBounds()) {
                val mainHeight = if (usesSponsoredLayout(manifest.layout, geometryVersion)) 85 else manifest.layoutConfig.safeAdHeight
                Box(Modifier.weight(mainHeight.toFloat()).fillMaxWidth().clipToBounds().then(if (preview == null) Modifier else Modifier.semantics { contentDescription = "OoroV3Region:main-ad" }.onSizeChanged { Log.i("OoroRenderTest", "region=main-ad boundsPx=${it.width}x${it.height}") })) { PrimaryAdRegion(vm, Modifier.fillMaxSize(), item, playbackOffset, preview, if (manifestExpired) "Offline ads paused\nAuthorization expired. Reconnect to refresh approved content." else "OORO\nContent will resume shortly") }
                if (usesSponsoredLayout(manifest.layout, geometryVersion)) {
                    Box(Modifier.weight(15f).fillMaxWidth().clipToBounds().then(if (preview == null) Modifier else Modifier.semantics { contentDescription = "OoroV3Region:sponsored" }.onSizeChanged { Log.i("OoroRenderTest", "region=sponsored boundsPx=${it.width}x${it.height}") })) {
                        SponsoredAdRegion(vm, sponsoredItem, Modifier.fillMaxSize(), preview?.sponsoredAssetPath)
                    }
                } else if (shouldRenderNewsTicker(manifest.layout, geometryVersion)) {
                    NewsTicker(if (manifestExpired) NewsConfig() else manifest.news, Modifier.weight((100 - mainHeight).toFloat()).fillMaxWidth().clipToBounds().then(if (preview == null) Modifier else Modifier.semantics { contentDescription = "OoroRegion:news-ticker" }))
                }
            }
            Column(Modifier.weight((100 - adWidth).toFloat()).fillMaxHeight().clipToBounds()) {
                Box(Modifier.weight(sidebarSplit.toFloat()).fillMaxWidth().clipToBounds().then(if (preview == null) Modifier else Modifier.semantics { contentDescription = "OoroV3Region:qr-offer" }.onSizeChanged { Log.i("OoroRenderTest", "region=qr-offer boundsPx=${it.width}x${it.height}") })) { OfferPanel(displayedOffer, Modifier.fillMaxSize(), verticalV3 = geometryVersion >= 3) }
                Box(Modifier.weight((100 - sidebarSplit).toFloat()).fillMaxWidth().clipToBounds().then(if (preview == null) Modifier else Modifier.semantics { contentDescription = "OoroV3Region:navigation" }.onSizeChanged { Log.i("OoroRenderTest", "region=navigation boundsPx=${it.width}x${it.height}") })) { NavigationPanel(vm, preview, Modifier.fillMaxSize()) }
            }
        } else if (manifest.layout == DisplayLayout.SPLIT_50_25_25) Row(Modifier.fillMaxSize().clipToBounds()) {
            Box(Modifier.weight(2f).fillMaxHeight().clipToBounds()) { PrimaryAdRegion(vm, Modifier.fillMaxSize(), item, playbackOffset, preview, if (manifestExpired) "Offline ads paused\nAuthorization expired. Reconnect to refresh approved content." else "OORO\nContent will resume shortly") }
            Box(Modifier.weight(1f).fillMaxHeight().clipToBounds()) { NavigationPanel(vm, preview, Modifier.fillMaxSize()) }
            Box(Modifier.weight(1f).fillMaxHeight().clipToBounds()) { OfferPanel(displayedOffer, Modifier.fillMaxSize()) }
        } else PrimaryAdRegion(vm, Modifier.fillMaxSize().clipToBounds(), item, playbackOffset, preview, if (manifestExpired) "Offline ads paused\nAuthorization expired. Reconnect to refresh approved content." else "OORO\nContent will resume shortly")
    }
}

@Composable private fun SponsoredAdRegion(vm: ScreenViewModel?, item: ManifestItem?, modifier: Modifier, previewAssetPath: String? = null) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val lifecycleState by lifecycleOwner.lifecycle.currentStateFlow.collectAsState()
    if (item == null || (vm == null && previewAssetPath == null)) {
        Box(modifier.background(Color(0xFF101418)).clipToBounds().then(if (previewAssetPath == null && vm == null) Modifier.semantics { contentDescription = "Sponsored slot neutral placeholder" } else Modifier))
        return
    }
    var path by remember(item.id) { mutableStateOf<String?>(null) }
    LaunchedEffect(item.id, previewAssetPath) { path = previewAssetPath ?: vm?.localFile(item) }
    BoxWithConstraints(modifier.background(Color.Black).clipToBounds(), contentAlignment = Alignment.Center) {
        val density = androidx.compose.ui.platform.LocalDensity.current
        val widthPx = with(density) { maxWidth.roundToPx().coerceAtLeast(1) }
        val heightPx = with(density) { maxHeight.roundToPx().coerceAtLeast(1) }
        val bitmap by produceState<Bitmap?>(null, item.id, path, widthPx, heightPx) {
            value = path?.let { withContext(Dispatchers.IO) { decodeCreativeImage(it, widthPx, heightPx) } }
        }
        // Compose can retain a recorded display list briefly after this node is disposed.
        // Do not recycle the backing bitmap here; let it be collected after Compose drops it.
        val imageBitmap = remember(bitmap) { bitmap?.asImageBitmap() }
        LaunchedEffect(item.id, bitmap, lifecycleState) {
            if (vm != null && bitmap != null && lifecycleState == Lifecycle.State.RESUMED) {
                val startedAt = SystemClock.elapsedRealtime()
                kotlinx.coroutines.delay(item.durationSeconds.coerceAtLeast(1) * 1_000L)
                vm.sponsoredDisplayCompleted(item, (SystemClock.elapsedRealtime() - startedAt).coerceAtLeast(0L))
            }
        }
        if (imageBitmap != null) Image(imageBitmap, if (previewAssetPath == null) "Sponsored advertisement" else "Sponsored test advertisement", Modifier.fillMaxSize().clipToBounds().then(
            if (previewAssetPath == null) Modifier else Modifier.onSizeChanged { bounds ->
                val content = fittedContentBounds(bitmap!!.width, bitmap!!.height, bounds.width, bounds.height)
                Log.i("OoroRenderTest", "sponsored sourcePx=${bitmap!!.width}x${bitmap!!.height} mediaPx=${content.width}x${content.height} viewportPx=${bounds.width}x${bounds.height} fit=FIT proofsDisabled=true")
            }
        ), contentScale = ContentScale.Fit)
        else Box(Modifier.fillMaxSize().background(Color(0xFF101418)))
    }
}

internal fun nextScheduleBoundary(item: ManifestItem, now: Instant, zone: ZoneId): Instant? {
    val candidates = buildList {
        item.startAt?.takeIf { it.isAfter(now) }?.let(::add)
        item.endAt?.takeIf { it.isAfter(now) }?.let(::add)
        if (item.daysOfWeek.isNotEmpty() || item.startTime != null || item.endTime != null) {
            val localDate = now.atZone(zone).toLocalDate()
            for (offset in 0..8) {
                val date = localDate.plusDays(offset.toLong())
                if (item.daysOfWeek.isNotEmpty()) date.atStartOfDay(zone).toInstant().takeIf { it.isAfter(now) }?.let(::add)
                item.startTime?.let { date.atTime(it).atZone(zone).toInstant().takeIf { instant -> instant.isAfter(now) }?.let(::add) }
                item.endTime?.let { date.atTime(it).atZone(zone).toInstant().takeIf { instant -> instant.isAfter(now) }?.let(::add) }
            }
        }
    }
    return candidates.minOrNull()
}

@Composable private fun NewsTicker(news: NewsConfig, modifier: Modifier) {
    SideEffect { RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.TICKER_COMPOSITION) }
    val announcements = remember(news.announcements) { news.announcements.sortedWith(compareByDescending<NewsAnnouncement> { it.priority }.thenBy { it.id }) }
    val message = announcements.joinToString("   •   ") { it.text.trim() }.ifBlank { "OORO" }
    val offset = remember(message) { Animatable(0f) }
    val density = androidx.compose.ui.platform.LocalDensity.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val lifecycleState by lifecycleOwner.lifecycle.currentStateFlow.collectAsState()
    val textMeasurer = rememberTextMeasurer()
    BoxWithConstraints(modifier.background(Color(0xFF1C232A)).padding(horizontal = 18.dp)) {
        val textStyle = LocalTextStyle.current.merge(TextStyle(color = Color.White, fontSize = 16.sp))
        val textWidthPx = remember(message, textStyle, density) {
            textMeasurer.measure(AnnotatedString(message), style = textStyle, maxLines = 1, softWrap = false).size.width.toFloat()
        }
        val viewportWidthPx = with(density) { maxWidth.toPx() }
        val shouldScroll = tickerNeedsScroll(
            isVisible = true,
            isResumed = lifecycleState == Lifecycle.State.RESUMED,
            hasAnnouncements = announcements.isNotEmpty(),
            textWidthPx = textWidthPx,
            viewportWidthPx = viewportWidthPx,
        )
        val gap = 36.dp
        val gapPx = with(density) { gap.toPx() }
        LaunchedEffect(message, news.scrollSpeed, textWidthPx, viewportWidthPx, lifecycleState, shouldScroll) {
            if (!shouldScroll) { offset.snapTo(0f); return@LaunchedEffect }
            val segment = textWidthPx + gapPx
        val duration = (segment / news.scrollSpeed.coerceIn(10, 120) * 1000).toInt().coerceIn(8_000, 45_000)
        while (true) {
            offset.snapTo(0f)
            offset.animateTo(-segment, tween(duration))
        }
        }
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.CenterStart) {
            if (announcements.isEmpty()) Text("OORO", color = Color.LightGray, fontSize = 14.sp, maxLines = 1)
            else if (shouldScroll) Row(Modifier.graphicsLayer { translationX = offset.value }) {
                Text(message, color = Color.White, fontSize = 16.sp, maxLines = 1, softWrap = false)
                Spacer(Modifier.width(gap))
                Text(message, color = Color.White, fontSize = 16.sp, maxLines = 1, softWrap = false)
            } else Text(message, color = Color.White, fontSize = 16.sp, maxLines = 1, softWrap = false)
        }
    }
}

@Composable private fun PrimaryAdRegion(vm: ScreenViewModel?, modifier: Modifier, selectedItem: ManifestItem?, playbackKey: Int = 0, preview: PlayerPreviewConfig? = null, emptyMessage: String = "OORO\nContent will resume shortly") {
    SideEffect { RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.AD_COMPOSITION) }
    val item = selectedItem
    var path by remember(item?.id, playbackKey, preview) { mutableStateOf<String?>(null) }
    LaunchedEffect(item?.id, playbackKey, preview?.itemId, preview?.assetPaths) {
        val resolved = item?.let { preview?.assetPaths?.get(it.id) ?: vm?.localFile(it) }
        path = resolved
        if (item != null && resolved == null && preview == null) vm?.markAssetUnavailable(item.id)
    }
    val measuredBounds = if (preview == null) Modifier else Modifier.onSizeChanged { size ->
        Log.i("OoroRenderTest", "region creativeId=${item?.creativeId} boundsPx=${size.width}x${size.height} fit=${item?.fitMode}")
    }
    Box(modifier.background(Color.Black).clipToBounds().then(measuredBounds), contentAlignment = Alignment.Center) {
        if (item == null || path == null) Text(emptyMessage, color = Color.White, fontSize = 24.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        else if (item.type == CreativeType.IMAGE) {
            if (path != null) BoxWithConstraints(Modifier.fillMaxSize().clipToBounds()) {
                val density = androidx.compose.ui.platform.LocalDensity.current
                val widthPx = with(density) { maxWidth.roundToPx().coerceAtLeast(1) }
                val heightPx = with(density) { maxHeight.roundToPx().coerceAtLeast(1) }
                val decodeKey = remember(path, widthPx, heightPx) { CreativeImageDecodeKey(path!!, widthPx, heightPx) }
                val bitmapState = remember(decodeKey) { mutableStateOf<Bitmap?>(null) }
                val doneState = remember(decodeKey) { mutableStateOf(false) }
                val bitmap = bitmapState.value
                LaunchedEffect(decodeKey) {
                    bitmapState.value = null; doneState.value = false
                    var decoded: Bitmap? = null
                    try {
                        RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.IMAGE_DECODE)
                        decoded = withContext(Dispatchers.IO) { decodeCreativeImage(path!!, widthPx, heightPx) }
                        if (decoded != null) RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.IMAGE_DECODED_BYTES, decoded!!.allocationByteCount.toLong())
                        currentCoroutineContext().ensureActive()
                        bitmapState.value = decoded; decoded = null
                    } finally { decoded?.recycle(); doneState.value = true }
                }
                // Compose may draw a retained display list after disposal. Recycling the
                // bitmap synchronously can crash that frame; allow the bitmap to be GC'd.
                val imageBitmap = remember(bitmap) { bitmap?.asImageBitmap() }
                LaunchedEffect(item.id, playbackKey, path, widthPx, heightPx) {
                    val loaded = snapshotFlow { bitmapState.value to doneState.value }.first { it.first != null || it.second }
                    if (preview == null) {
                        vm?.creativeStarted(item)
                        if (loaded.first == null) vm?.creativeFinished(item, 0, false, "IMAGE_DECODE_FAILED")
                        else { kotlinx.coroutines.delay(item.durationSeconds * 1000L); vm?.creativeFinished(item, item.durationSeconds * 1000L, true) }
                    }
                }
                if (imageBitmap != null) Image(
                    imageBitmap, "OORO creative", Modifier.fillMaxSize().clipToBounds().then(
                        if (preview == null) Modifier else Modifier.onSizeChanged { bounds ->
                            val content = fittedContentBounds(bitmap!!.width, bitmap!!.height, bounds.width, bounds.height)
                            Log.i("OoroRenderTest", "image creativeId=${item.creativeId} sourcePx=${bitmap!!.width}x${bitmap!!.height} mediaPx=${content.width}x${content.height} viewportPx=${bounds.width}x${bounds.height} fit=${item.fitMode}")
                        }
                    ), contentScale = item.fitMode.toContentScale()
                )
                else Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) { Text("Preparing advertisement…", color = Color.White) }
            } else Text("Preparing advertisement…", color = Color.White)
        }
        else {
            val context = LocalContext.current
            val lifecycleOwner = LocalLifecycleOwner.current
            val lifecycleState by lifecycleOwner.lifecycle.currentStateFlow.collectAsState()
            var videoSize by remember(item.id, playbackKey) { mutableStateOf(androidx.media3.common.VideoSize.UNKNOWN) }
            var videoViewport by remember(item.id, playbackKey) { mutableStateOf(androidx.compose.ui.unit.IntSize.Zero) }
            val playerKey = remember(item.id, playbackKey, preview != null) { CreativePlaybackKey(item.id, playbackKey, preview != null) }
            val creative = remember(playerKey) {
                Log.i("OoroScreen", "media player created creativeId=${item.creativeId} itemId=${item.id} key=$playbackKey")
                Media3CreativePlayer(
                    context.applicationContext,
                    onStarted = { if (preview == null) vm?.creativeStarted(item) },
                    onCompleted = { ms -> if (preview == null) vm?.creativeFinished(item, ms, true) },
                    onFailed = { e -> if (preview == null) vm?.creativeFinished(item, creativeDuration(item), false, e.message) },
                    onPosition = { position -> if (preview == null) vm?.creativePosition(item, position) },
                    onVideoSize = { size -> videoSize = size },
                    repeatOne = preview != null
                )
            }
            LaunchedEffect(videoSize, videoViewport, preview) {
                if (preview != null && videoSize.width > 0 && videoSize.height > 0 && videoViewport.width > 0 && videoViewport.height > 0) {
                    val rotation = Math.floorMod(videoSize.unappliedRotationDegrees, 360)
                    val aspectWidth = (videoSize.width * videoSize.pixelWidthHeightRatio).toInt().coerceAtLeast(1)
                    val source = if (rotation == 90 || rotation == 270) videoSize.height to aspectWidth else aspectWidth to videoSize.height
                    val content = fittedContentBounds(source.first, source.second, videoViewport.width, videoViewport.height)
                    Log.i("OoroRenderTest", "video creativeId=${item.creativeId} sourcePx=${videoSize.width}x${videoSize.height} rotation=$rotation pixelRatio=${videoSize.pixelWidthHeightRatio} mediaPx=${content.width}x${content.height} viewportPx=${videoViewport.width}x${videoViewport.height} fit=${item.fitMode}")
                }
            }
            LaunchedEffect(lifecycleState, creative) {
                if (lifecycleState == Lifecycle.State.RESUMED) {
                    if (creative.player.mediaItemCount > 0 && creative.player.playbackState != androidx.media3.common.Player.STATE_ENDED) creative.player.play()
                } else creative.player.pause()
            }
            DisposableEffect(path, playbackKey) {
                creative.play(path!!)
                if (lifecycleState != Lifecycle.State.RESUMED) creative.player.pause()
                onDispose {
                    if (preview == null && creative.player.isPlaying) vm?.creativeFinished(item, creative.player.currentPosition, false, "INTERRUPTED")
                    creative.close()
                    Log.i("OoroScreen", "media player released creativeId=${item.creativeId} itemId=${item.id} key=$playbackKey")
                }
            }
            AndroidView(
                factory = { context -> PlayerView(context).apply { useController = false; resizeMode = item.fitMode.toResizeMode(); Log.i("OoroScreen", "video surface created creativeId=${item.creativeId} itemId=${item.id}") } },
                modifier = Modifier.fillMaxSize().clipToBounds().then(if (preview == null) Modifier else Modifier.onSizeChanged { bounds -> videoViewport = bounds }),
                update = { view ->
                    if (needsIdentityBinding(view.player, creative.player)) {
                        Log.i("OoroScreen", "video surface rebound creativeId=${item.creativeId} itemId=${item.id}")
                        view.player = creative.player
                    }
                    val resizeMode = item.fitMode.toResizeMode()
                    if (view.resizeMode != resizeMode) view.resizeMode = resizeMode
                },
                onRelease = { view -> view.player = null; Log.i("OoroScreen", "video surface released creativeId=${item.creativeId} itemId=${item.id}") }
            )
        }
    }
}
private fun FitMode.toContentScale() = when (creativeScaleBehavior(this)) { CreativeScaleBehavior.CROP -> ContentScale.Crop; CreativeScaleBehavior.CONTAIN -> ContentScale.Fit }
private fun FitMode.toResizeMode() = when (creativeScaleBehavior(this)) { CreativeScaleBehavior.CROP -> androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM; CreativeScaleBehavior.CONTAIN -> androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT }
private fun creativeDuration(item: ManifestItem) = item.durationSeconds * 1000L

@Composable private fun NavigationPanel(vm: ScreenViewModel?, preview: PlayerPreviewConfig?, modifier: Modifier) {
    val navigationFlow = remember(vm, preview?.navigation) {
        if (preview != null) flowOf(preview.navigation) else vm?.navigation ?: flowOf(NavigationState())
    }
    val nav by navigationFlow.collectAsState(initial = preview?.navigation ?: NavigationState())
    val onMapHealth: (Boolean, String?) -> Unit = remember(vm, preview?.onMapHealth) {
        preview?.onMapHealth ?: { rendered, error -> vm?.reportMapHealth(rendered, error); Unit }
    }
    val showMap = navigationMapIsVisible(nav.active)
    Box(modifier.background(Panel).clipToBounds().padding(4.dp)) {
        if (showMap) MapPanel(nav, Modifier.fillMaxSize().clipToBounds(), onMapHealth)
        else Box(Modifier.fillMaxSize().background(Panel))
        if (nav.active) {
            Text("▲", color = Yellow, fontSize = 22.sp, modifier = Modifier.align(Alignment.Center))
            if ((nav.nextInstruction ?: nav.destinationName) != null) Text(nav.nextInstruction ?: nav.destinationName.orEmpty(), color = Color.White, fontSize = 12.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, modifier = Modifier.align(Alignment.TopStart).fillMaxWidth().background(Color(0xAA121820)).padding(horizontal = 6.dp, vertical = 4.dp))
        }
    }
}
@Composable private fun MapPanel(nav: NavigationState, modifier: Modifier, onMapHealth: (Boolean, String?) -> Unit) {
    SideEffect { RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.MAP_COMPOSITION) }
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    remember(context.applicationContext) {
        org.maplibre.android.MapLibre.getInstance(context.applicationContext, "", org.maplibre.android.WellKnownTileServer.MapLibre)
        true
    }
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var mapView by remember { mutableStateOf<MapView?>(null) }
    var vehicleMarker by remember { mutableStateOf<Marker?>(null) }
    var mapLoaded by remember { mutableStateOf(false) }
    var mapError by remember { mutableStateOf<String?>(null) }
    var lastCameraTarget by remember { mutableStateOf<LatLng?>(null) }
    var lastCameraMoveAt by remember { mutableLongStateOf(0L) }

    DisposableEffect(lifecycleOwner, mapView) {
        val activeMapView = mapView ?: return@DisposableEffect onDispose { }
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> activeMapView.onStart()
                Lifecycle.Event.ON_RESUME -> activeMapView.onResume()
                Lifecycle.Event.ON_PAUSE -> activeMapView.onPause()
                Lifecycle.Event.ON_STOP -> activeMapView.onStop()
                else -> Unit
            }
        }
        // LifecycleRegistry replays ON_CREATE/ON_START/ON_RESUME for the current
        // state when the observer is attached. Do not invoke these manually too.
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val latitude = nav.currentLatitude
    val longitude = nav.currentLongitude
    LaunchedEffect(map) {
        if (map == null) return@LaunchedEffect
        onMapHealth(false, null)
        kotlinx.coroutines.delay(5_000)
        if (!mapLoaded) {
            mapError = mapError ?: "Map tiles unavailable"
            onMapHealth(false, mapError)
        }
    }
    LaunchedEffect(map, latitude, longitude) {
        val readyMap = map ?: return@LaunchedEffect
        val lat = latitude ?: return@LaunchedEffect
        val lon = longitude ?: return@LaunchedEffect
        val target = LatLng(lat, lon)
        val marker = vehicleMarker
        if (marker == null) {
            vehicleMarker = readyMap.addMarker(MarkerOptions().position(target).title("OORO vehicle"))
        } else {
            marker.position = target
            readyMap.updateMarker(marker)
        }
        val previous = lastCameraTarget
        if (previous == null) {
            readyMap.moveCamera(CameraUpdateFactory.newLatLngZoom(target, 14.0))
        } else if (distanceMeters(previous, target) >= 100.0 && android.os.SystemClock.elapsedRealtime() - lastCameraMoveAt >= 20_000L) {
            readyMap.easeCamera(CameraUpdateFactory.newLatLngZoom(target, 14.0), 700)
            lastCameraMoveAt = android.os.SystemClock.elapsedRealtime()
        }
        lastCameraTarget = target
    }

    Box(modifier.background(Color(0xFF263238))) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { MapView(context).also { createdMapView ->
                RuntimeDiagnostics.mapCreated()
                mapView = createdMapView
                createdMapView.onCreate(null)
                createdMapView.addOnTileActionListener { operation, _, _, _, _, _, reason ->
                    when (operation) {
                        TileOperation.LoadFromNetwork, TileOperation.LoadFromCache -> {
                            mapLoaded = true
                            mapError = null
                            onMapHealth(true, null)
                            Log.i("OoroScreen", "MAP_TILE_LOADED operation=$operation provider=MapLibre source=OpenStreetMap")
                        }
                        TileOperation.Error -> {
                            mapLoaded = false
                            mapError = reason.take(160).ifBlank { "Map tiles unavailable" }
                            onMapHealth(false, mapError)
                            Log.w("OoroScreen", "MAP_TILE_ERROR reason=$mapError")
                        }
                        else -> Unit
                    }
                }
                createdMapView.addOnDidFailLoadingMapListener { reason ->
                    mapLoaded = false
                    mapError = reason.take(160).ifBlank { "Map tiles unavailable" }
                    onMapHealth(false, mapError)
                    Log.w("OoroScreen", "MAP_TILES_UNAVAILABLE reason=$mapError")
                }
                createdMapView.getMapAsync { readyMap ->
                    map = readyMap
                    readyMap.setStyle(Style.Builder().fromJson(OSM_STYLE)) {
                        Log.i("OoroScreen", "MAP_STYLE_LOADED provider=MapLibre source=OpenStreetMap")
                        mapError = null
                    }
                }
            } },
            update = { },
            onRelease = { releasedMapView ->
                val state = lifecycleOwner.lifecycle.currentState
                if (state.isAtLeast(Lifecycle.State.RESUMED)) releasedMapView.onPause()
                if (state.isAtLeast(Lifecycle.State.STARTED)) releasedMapView.onStop()
                releasedMapView.onDestroy()
                RuntimeDiagnostics.mapReleased()
                mapView = null
                map = null
                vehicleMarker = null
            }
        )
        if (latitude == null || longitude == null) Text("Locating…", color = Color.White, fontSize = 18.sp, modifier = Modifier.align(Alignment.Center))
        else if (!mapLoaded && mapError != null) Text("Map tiles unavailable · GPS active", color = Color.LightGray, fontSize = 13.sp, modifier = Modifier.align(Alignment.BottomStart).background(Color(0xAA121820)).padding(6.dp))
    }
}
private const val OSM_STYLE = """{"version":8,"sources":{"osm":{"type":"raster","tiles":["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],"tileSize":256,"attribution":"© OpenStreetMap contributors"}},"layers":[{"id":"osm","type":"raster","source":"osm"}]}"""

private fun distanceMeters(start: LatLng, end: LatLng): Double {
    val earthRadius = 6_371_000.0
    val dLat = Math.toRadians(end.latitude - start.latitude)
    val dLon = Math.toRadians(end.longitude - start.longitude)
    val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) + kotlin.math.cos(Math.toRadians(start.latitude)) * kotlin.math.cos(Math.toRadians(end.latitude)) * kotlin.math.sin(dLon / 2) * kotlin.math.sin(dLon / 2)
    return earthRadius * 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
}

@Composable private fun OfferPanel(item: ManifestItem?, modifier: Modifier, verticalV3: Boolean = false) {
    if (verticalV3) V3OfferPanel(item, modifier) else LegacyOfferPanel(item, modifier)
}

@Composable private fun LegacyOfferPanel(item: ManifestItem?, modifier: Modifier) {
    SideEffect { RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.OFFER_COMPOSITION) }
    val offer = item?.offer ?: OfferMetadata()
    val brand = offer.brandName?.trim()?.takeIf(String::isNotBlank)
    val message = (offer.promotionalText ?: offer.offerTitle ?: offer.offerSubtitle)?.trim()?.takeIf(String::isNotBlank)
    BoxWithConstraints(modifier.background(Color(0xFF20252B)).clipToBounds().semantics { contentDescription = "OoroOfferState:legacy" }.padding(horizontal = 10.dp, vertical = 6.dp)) {
        val size = minOf(maxWidth * 0.46f, maxHeight * 0.88f)
        val pixels = with(androidx.compose.ui.platform.LocalDensity.current) { size.roundToPx().coerceIn(64, 512) }
        val destination = offer.validQrUrl
        val bitmap by produceState<Bitmap?>(null, destination, pixels) {
            value = if (destination == null) null else withContext(Dispatchers.IO) { qrBitmap(destination, pixels) }
        }
        val image = remember(bitmap) { bitmap?.asImageBitmap() }
        Row(Modifier.fillMaxSize().clipToBounds(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(0.48f).padding(end = 8.dp), verticalArrangement = Arrangement.Center) {
                if (message != null) Text(message, color = Yellow, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                if (brand != null) Text(brand, color = Color.White, fontSize = 14.sp, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                if (image != null && !offer.ctaLabel.isNullOrBlank()) Text(offer.ctaLabel!!.trim(), color = Color(0xFFB8C0C8), fontSize = 11.sp, maxLines = 2, modifier = Modifier.padding(top = 5.dp))
                if (brand == null && message == null) Text("OORO", color = Yellow, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            }
            Box(Modifier.weight(0.52f).fillMaxHeight(), contentAlignment = Alignment.CenterEnd) {
                if (image != null) Image(image, "Advertisement QR code", Modifier.size(size).background(Color.White).padding(5.dp), contentScale = ContentScale.Fit)
            }
        }
    }
}

@Composable private fun V3OfferPanel(item: ManifestItem?, modifier: Modifier) {
    SideEffect { RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.OFFER_COMPOSITION) }
    val offer = item?.offer
    val brandName = offer?.brandName?.trim()?.takeIf(String::isNotBlank)
    val qrUrl = offer?.validQrUrl
    // Brand content is shown only with a valid, server-supplied destination. No QR or offer is invented.
    val hasAuthorizedOffer = item != null && brandName != null && qrUrl != null
    val offerCopy = sequenceOf(offer?.promotionalText, offer?.offerTitle, offer?.offerSubtitle, offer?.offerValue)
        .mapNotNull { it?.trim()?.takeIf(String::isNotBlank) }.firstOrNull()
    BoxWithConstraints(
        modifier.background(Color(0xFF101418)).clipToBounds().semantics {
            contentDescription = if (hasAuthorizedOffer) "OoroOfferState:brand" else "OoroOfferState:fallback"
        }
    ) {
        val compact = maxWidth < 190.dp || maxHeight < 270.dp
        val contentPadding = if (compact) 7.dp else 10.dp
        val qrSize = minOf(maxWidth - contentPadding * 2, maxHeight * if (compact) 0.37f else 0.42f)
            .coerceAtLeast(minOf(64.dp, maxWidth - contentPadding * 2))
        val density = androidx.compose.ui.platform.LocalDensity.current
        val qrPixels = with(density) { qrSize.roundToPx().coerceIn(64, 512) }
        val qrState = produceState<Bitmap?>(null, if (hasAuthorizedOffer) qrUrl else null, qrPixels) {
            value = null
            if (hasAuthorizedOffer && qrUrl != null) value = withContext(Dispatchers.IO) { qrBitmap(qrUrl, qrPixels) }
        }
        val qr = qrState.value
        val qrImage = remember(qr) { qr?.asImageBitmap() }
        val showBrand = hasAuthorizedOffer
        Column(
            modifier = Modifier.fillMaxSize().clipToBounds().padding(contentPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (showBrand) {
                Text(
                    brandName.orEmpty(), color = Yellow,
                    fontSize = if (compact) 15.sp else 18.sp,
                    fontWeight = FontWeight.Bold, maxLines = 2,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                if (offerCopy != null) {
                    Spacer(Modifier.height(if (compact) 3.dp else 5.dp))
                    Text(
                        offerCopy, color = Color.White,
                        fontSize = if (compact) 11.sp else 14.sp,
                        fontWeight = FontWeight.Medium, maxLines = if (compact) 2 else 3,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
                Spacer(Modifier.height(if (compact) 5.dp else 8.dp))
                if (qrImage != null) {
                    Image(
                        bitmap = qrImage,
                        contentDescription = "Brand offer QR code",
                        modifier = Modifier.size(qrSize).background(Color.White).padding(if (compact) 5.dp else 8.dp),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Text("QR unavailable", color = Color(0xFFD7DDE3), fontSize = if (compact) 9.sp else 11.sp, modifier = Modifier.size(qrSize).background(Color.White), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
                Spacer(Modifier.height(if (compact) 4.dp else 7.dp))
                if (qrImage != null) Text(
                    offer?.ctaLabel?.trim()?.takeIf(String::isNotBlank) ?: "SCAN FOR DETAILS",
                    color = Color(0xFFD7DDE3), fontSize = if (compact) 9.sp else 11.sp,
                    fontWeight = FontWeight.SemiBold, maxLines = 2,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            } else {
                Text("OORO", color = Yellow, fontSize = if (compact) 22.sp else 28.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
                Spacer(Modifier.height(if (compact) 5.dp else 9.dp))
                Text("Advertise your business here", color = Color.White, fontSize = if (compact) 12.sp else 15.sp, fontWeight = FontWeight.Medium, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Spacer(Modifier.height(if (compact) 7.dp else 12.dp))
                Text("+91 7981399132", color = Yellow, fontSize = if (compact) 14.sp else 18.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                Spacer(Modifier.height(if (compact) 2.dp else 4.dp))
                Text("For advertisements", color = Color(0xFFD7DDE3), fontSize = if (compact) 10.sp else 12.sp, maxLines = 1)
            }
        }
    }
}

private val qrBitmapCache = object : LruCache<String, Bitmap>(768) {
    override fun sizeOf(key: String, value: Bitmap): Int = (value.allocationByteCount / 1024).coerceAtLeast(1)
}

@Synchronized
internal fun qrBitmap(value: String, size: Int): Bitmap? {
    if (size <= 0) return null
    val key = "$size:$value"
    qrBitmapCache.get(key)?.let { return it }
    val bitmap = runCatching {
        val hints = mapOf(EncodeHintType.MARGIN to 4, EncodeHintType.CHARACTER_SET to "UTF-8")
        val matrix = MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, size, size, hints)
        val pixels = IntArray(size * size) { index -> if (matrix[index % size, index / size]) android.graphics.Color.BLACK else android.graphics.Color.WHITE }
        Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).also { it.setPixels(pixels, 0, size, 0, 0, size, size) }
    }.getOrNull() ?: return null
    qrBitmapCache.put(key, bitmap)
    RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.QR_DECODE)
    RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.QR_DECODED_BYTES, bitmap.allocationByteCount.toLong())
    return bitmap
}
internal enum class TechnicianSection(val title: String, val subtitle: String) {
    OVERVIEW("Overview", "Device at a glance"),
    PLAYBACK("Playback", "Media and authorization"),
    PRESENTATION("Presentation", "Local screen geometry"),
    SETTINGS("Settings", "Permissions, device & repair")
}

internal data class TechnicianStateSubscriptions(
    val diagnostics: Boolean,
    val playback: Boolean,
    val mapHealth: Boolean,
)

internal fun technicianStateSubscriptions(section: TechnicianSection): TechnicianStateSubscriptions = when (section) {
    TechnicianSection.OVERVIEW -> TechnicianStateSubscriptions(diagnostics = true, playback = true, mapHealth = false)
    TechnicianSection.PLAYBACK -> TechnicianStateSubscriptions(diagnostics = true, playback = true, mapHealth = false)
    TechnicianSection.PRESENTATION -> TechnicianStateSubscriptions(diagnostics = false, playback = false, mapHealth = false)
    TechnicianSection.SETTINGS -> TechnicianStateSubscriptions(diagnostics = true, playback = false, mapHealth = true)
}

@Composable private fun Admin(
    vm: ScreenViewModel,
    manifest: DeviceManifest?,
    locationGranted: Boolean,
    locationState: OptionalLocationState,
    locationMessage: String?,
    onRequestLocation: () -> Unit,
    onOpenAppSettings: () -> Unit,
    presentationPreference: PresentationPreference,
    onPresentationPreferenceChanged: (PresentationPreference) -> Unit
) {
    var section by remember { mutableStateOf(TechnicianSection.OVERVIEW) }
    var repairCodeDialog by remember { mutableStateOf(false) }
    var repairCode by remember { mutableStateOf("") }
    var repairCodeError by remember { mutableStateOf<String?>(null) }
    val subscriptions = technicianStateSubscriptions(section)
    val diagnosticsFlow = remember(vm, subscriptions.diagnostics) {
        if (subscriptions.diagnostics) vm.diagnostics else flowOf(DiagnosticsState())
    }
    val playbackFlow = remember(vm, subscriptions.playback) {
        if (subscriptions.playback) vm.currentCreative else flowOf(null)
    }
    val mapRenderedFlow = remember(vm, subscriptions.mapHealth) {
        if (subscriptions.mapHealth) vm.mapTilesRendered else flowOf(false)
    }
    val mapErrorFlow = remember(vm, subscriptions.mapHealth) {
        if (subscriptions.mapHealth) vm.mapTileError else flowOf(null)
    }
    val d by diagnosticsFlow.collectAsState(initial = DiagnosticsState())
    val currentCreative by playbackFlow.collectAsState(initial = null)
    val mapTilesRendered by mapRenderedFlow.collectAsState(initial = false)
    val mapTileError by mapErrorFlow.collectAsState(initial = null)
    val context = LocalContext.current
    val network = remember(d.probe) { networkInfo(context) }
    val location = remember(locationGranted) { locationDiagnostics(context) }
    val storage = remember { storageSummary(context) }
    val apiOk = d.probe?.connected == true
    val agentInstalled = remember {
        runCatching { context.packageManager.getPackageInfo("com.ooro.deviceagent", 0) }.isSuccess
    }

    BoxWithConstraints(Modifier.fillMaxSize().background(Color(0xFF080A0D))) {
        val wide = maxWidth >= 800.dp
        Column(Modifier.fillMaxSize().padding(if (wide) 20.dp else 10.dp)) {
            Row(Modifier.fillMaxWidth().heightIn(min = 54.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.width(4.dp).height(34.dp).clip(RoundedCornerShape(2.dp)).background(Yellow))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("OORO", color = Yellow, fontSize = 19.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
                            Text("/", color = Color(0xFF58616A), fontSize = 17.sp)
                            Text("DISPLAYOS", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
                            Text("TECHNICIAN CONSOLE", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        }
                        Text(vm.deviceId, color = Color(0xFF7F8A95), fontSize = 10.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                    }
                }
                StatusChip(if (vm.isPaired) "PAIRED" else "SETUP REQUIRED", if (vm.isPaired) Color(0xFF71D6A0) else Color(0xFFFFC46B))
                Spacer(Modifier.width(9.dp))
                OutlinedButton(onClick = { vm.closeAdmin() }, modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Return to advertising player" }) { Text("RETURN TO PLAYER", color = Color.White, fontSize = 11.sp) }
            }
            Spacer(Modifier.height(12.dp))
            if (wide) {
                Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column(Modifier.width(196.dp).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        TechnicianSection.values().forEach { destination ->
                            TechnicianNavItem(destination, selected = section == destination, onClick = { section = destination })
                        }
                        Spacer(Modifier.weight(1f))
                        TechnicianCard(containerColor = PanelRaised) {
                            Text("SCREEN STATUS", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                            Spacer(Modifier.height(7.dp))
                            Text(if (vm.isPaired) "Ready" else "Setup needed", color = if (vm.isPaired) Color(0xFF71D6A0) else Color(0xFFFFC46B), fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Text(
                                when {
                                    apiOk -> "OORO service reachable"
                                    subscriptions.diagnostics -> "Using local status"
                                    else -> "Live status available in Overview"
                                },
                                color = Muted,
                                fontSize = 11.sp
                            )
                        }
                    }
                    Column(Modifier.weight(1f).fillMaxHeight()) {
                        TechnicianSectionBody(section, vm, manifest, d, currentCreative, apiOk, network, location, locationState, locationMessage, onRequestLocation, onOpenAppSettings, presentationPreference, onPresentationPreferenceChanged, mapTilesRendered, mapTileError, storage, agentInstalled) { repairCode = ""; repairCodeError = null; repairCodeDialog = true }
                    }
                }
            } else {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    TechnicianSection.values().forEach { destination ->
                        TechnicianNavItem(destination, selected = section == destination, onClick = { section = destination }, compact = true, modifier = Modifier.weight(1f))
                    }
                }
                Spacer(Modifier.height(10.dp))
                Box(Modifier.weight(1f).fillMaxWidth()) { TechnicianSectionBody(section, vm, manifest, d, currentCreative, apiOk, network, location, locationState, locationMessage, onRequestLocation, onOpenAppSettings, presentationPreference, onPresentationPreferenceChanged, mapTilesRendered, mapTileError, storage, agentInstalled) { repairCode = ""; repairCodeError = null; repairCodeDialog = true } }
            }
        }
    }
    if (repairCodeDialog) AlertDialog(
        onDismissRequest = { repairCodeDialog = false },
        title = { Text("Repair screen") },
        text = { Column { Text("Enter the OORO technician code to continue repair."); Spacer(Modifier.height(12.dp)); OutlinedTextField(repairCode, { repairCode = it.take(32); repairCodeError = null }, label = { Text("OORO code") }, singleLine = true, isError = repairCodeError != null); repairCodeError?.let { Text(it, color = Color(0xFFFF6B6B), fontSize = 12.sp) } } },
        confirmButton = { TextButton(onClick = { if (isRepairAccessCode(repairCode)) { repairCodeDialog = false; vm.beginRepair() } else repairCodeError = "Incorrect OORO technician code." }) { Text("Continue") } },
        dismissButton = { TextButton(onClick = { repairCodeDialog = false }) { Text("Cancel") } }
    )
}

@Composable private fun TechnicianNavItem(section: TechnicianSection, selected: Boolean, onClick: () -> Unit, compact: Boolean = false, modifier: Modifier = Modifier) {
    val code = when (section) {
        TechnicianSection.OVERVIEW -> "01"
        TechnicianSection.PLAYBACK -> "02"
        TechnicianSection.PRESENTATION -> "03"
        TechnicianSection.SETTINGS -> "04"
    }
    Surface(onClick = onClick, color = if (selected) Color(0xFF211F14) else Color(0xFF11161C), shape = RoundedCornerShape(13.dp), border = BorderStroke(1.dp, if (selected) Color(0xFF5A4C0A) else Color(0xFF1D252D)), modifier = modifier.heightIn(min = if (compact) 50.dp else 62.dp).semantics { contentDescription = "${section.title} section" }) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(if (compact) 26.dp else 32.dp).clip(RoundedCornerShape(9.dp)).background(if (selected) Yellow else Color(0xFF222A32)), contentAlignment = Alignment.Center) {
                Text(code, color = if (selected) Color(0xFF17191B) else Muted, fontSize = if (compact) 8.sp else 9.sp, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                Text(section.title, color = if (selected) Yellow else Color.White, fontSize = if (compact) 10.sp else 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                if (!compact) Text(section.subtitle, color = Muted, fontSize = 9.sp, maxLines = 1)
            }
        }
    }
}

@Composable private fun TechnicianSectionBody(
    section: TechnicianSection,
    vm: ScreenViewModel,
    manifest: DeviceManifest?,
    diagnostics: DiagnosticsState,
    currentCreative: ManifestItem?,
    apiOk: Boolean,
    network: DeviceNetworkInfo,
    location: LocationDiagnostics,
    permissionState: OptionalLocationState,
    permissionMessage: String?,
    onRequestLocation: () -> Unit,
    onOpenAppSettings: () -> Unit,
    presentationPreference: PresentationPreference,
    onPresentationPreferenceChanged: (PresentationPreference) -> Unit,
    mapTilesRendered: Boolean,
    mapTileError: String?,
    storage: Triple<Long, Long, Long>,
    agentInstalled: Boolean,
    onRepair: () -> Unit
) {
    val context = LocalContext.current
    val sectionScrollState = rememberScrollState()
    var thermalSensors by remember { mutableStateOf<List<String>>(emptyList()) }
    LaunchedEffect(Unit) { thermalSensors = withContext(Dispatchers.IO) { readThermalSensors() } }
    LaunchedEffect(section) { sectionScrollState.scrollTo(0) }
    Column(Modifier.fillMaxSize().verticalScroll(sectionScrollState), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Text(section.title.uppercase(), color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text(section.subtitle, color = Color(0xFF9AA4AE), fontSize = 13.sp)
            }
        }
        when (section) {
            TechnicianSection.OVERVIEW -> {
                val offlineAuthorized = manifest?.let { manifestIsAuthorizedAt(it, java.time.Instant.now()) } == true
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TechnicianMetric("PAIRING", if (vm.isPaired) "Connected" else "Setup needed", vm.screenId, vm.isPaired, Modifier.weight(1f))
                    TechnicianMetric("NETWORK", if (network.internet) network.type else "Offline", network.ip ?: "No local address", network.internet, Modifier.weight(1f))
                    TechnicianMetric("OORO API", if (apiOk) "Reachable" else "Unavailable", diagnostics.probe?.httpStatus?.let { "HTTP $it" } ?: "Run a check", apiOk, Modifier.weight(1f))
                    TechnicianMetric("PROOF QUEUE", diagnostics.proofQueued.toString(), if (diagnostics.proofQueued == 0) "All caught up" else "Waiting to sync", diagnostics.proofQueued == 0, Modifier.weight(1f))
                }
                TechnicianCard(containerColor = PanelRaised) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(Modifier.size(52.dp).clip(RoundedCornerShape(13.dp)).background(Color(0xFF302B16)), contentAlignment = Alignment.Center) {
                            Text(if (currentCreative != null) "PLAY" else "AD", color = Yellow, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.5.sp)
                        }
                        Column(Modifier.weight(1f)) {
                            Text("CURRENTLY ON SCREEN", color = Yellow, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.9.sp)
                            Text(currentCreative?.creativeId ?: "No active creative", color = Color.White, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            Text(if (currentCreative != null) "Main advertising slot" else if (diagnostics.verifiedAssets > 0) "Verified local media is available" else "Waiting for eligible content", color = Muted, fontSize = 12.sp)
                        }
                        StatusChip(if (currentCreative != null) "PLAYING" else "STANDBY", if (currentCreative != null) Color(0xFF71D6A0) else Color(0xFFFFC46B))
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TechnicianMetric("OFFLINE MEDIA", if (offlineAuthorized && diagnostics.verifiedAssets > 0) "Authorized" else "Unavailable", "${diagnostics.verifiedAssets} verified · ${diagnostics.missingAssets} missing", offlineAuthorized && diagnostics.verifiedAssets > 0, Modifier.weight(1f))
                    TechnicianMetric("LAST SYNC", relativeTime(diagnostics.manifestLastSyncAt), "Heartbeat ${relativeTime(diagnostics.heartbeatLastSuccessAt)}", diagnostics.heartbeatLastSuccessAt != null, Modifier.weight(1f))
                }
                if (!apiOk) TechnicianNotice("Offline mode", "The player keeps using locally verified content while its authorization remains valid. Network recovery does not erase pairing or cached media.", Color(0xFFFFC46B))
                TextButton(onClick = { vm.runDiagnostics() }, enabled = !diagnostics.running, modifier = Modifier.heightIn(min = 48.dp)) { Text(if (diagnostics.running) "Checking connection…" else "Refresh device status", color = Yellow) }
            }
            TechnicianSection.PLAYBACK -> {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TechnicianCard(Modifier.weight(1.1f)) {
                        Text("PLAYBACK STATUS", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        Text(if (currentCreative != null) "Playing" else "Standby", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                        TechnicianLine("Current creative", currentCreative?.creativeId ?: "—")
                        TechnicianLine("Manifest", manifest?.version?.toString() ?: vm.manifestVersion)
                        TechnicianLine("Authorization", manifest?.validUntil?.toString() ?: "Unavailable")
                        TechnicianLine("Verified assets", diagnostics.verifiedAssets.toString())
                        TechnicianLine("Missing assets", diagnostics.missingAssets.toString())
                    }
                    TechnicianCard(Modifier.weight(1f)) {
                        Text("SLOT STATUS", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        TechnicianLine("Main ad", if (currentCreative != null) "Active" else if (diagnostics.verifiedAssets > 0) "Cached" else "Waiting")
                        TechnicianLine("Sponsored slot", when { manifest?.sponsoredItem == null -> "Neutral fallback"; manifest.sponsoredItem.endAt?.isBefore(java.time.Instant.now()) == true -> "Expired"; else -> "Manifest assigned" })
                        TechnicianLine("Cached playlist", "${diagnostics.verifiedAssets} verified assets")
                        TechnicianLine("Last manifest sync", relativeTime(diagnostics.manifestLastSyncAt))
                        TechnicianLine("Authorization rule", "Playback stops at expiry")
                    }
                }
                if (diagnostics.missingAssets > 0) TechnicianNotice("Some media is unavailable", "${diagnostics.missingAssets} manifest asset(s) failed local verification. The player will skip assets that are not verified.", Color(0xFFFFC46B))
                if (diagnostics.proofQueued > 0) TechnicianNotice("Proofs waiting to sync", "${diagnostics.proofQueued} genuine playback event(s) are queued. They remain local until the service acknowledges them.", Color(0xFFFFC46B))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { vm.runDiagnostics() }, enabled = !diagnostics.running, modifier = Modifier.heightIn(min = 48.dp)) { Text("VERIFY CACHE") }
                    OutlinedButton(onClick = { vm.retryQueue() }, enabled = diagnostics.proofQueued > 0, modifier = Modifier.heightIn(min = 48.dp)) { Text("RETRY PROOF SYNC") }
                }
                Text("Technician preview is informational only. It does not generate playback or proof events.", color = Color(0xFF9AA4AE), fontSize = 12.sp)
            }
            TechnicianSection.PRESENTATION -> {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    TechnicianLayoutPreview(Modifier.weight(1f))
                    TechnicianCard(Modifier.weight(1f)) {
                        Text("PRESENTATION MODE", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text("${presentationPreference.name}", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (presentationPreference == PresentationPreference.AUTO_FROM_MANIFEST) Button(onClick = { onPresentationPreferenceChanged(PresentationPreference.AUTO_FROM_MANIFEST) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("AUTO · ACTIVE") }
                            else OutlinedButton(onClick = { onPresentationPreferenceChanged(PresentationPreference.AUTO_FROM_MANIFEST) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("AUTO") }
                            if (presentationPreference == PresentationPreference.OORO_V3_PRESENTATION) Button(onClick = { onPresentationPreferenceChanged(PresentationPreference.OORO_V3_PRESENTATION) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("OORO V3 · ACTIVE") }
                            else OutlinedButton(onClick = { onPresentationPreferenceChanged(PresentationPreference.OORO_V3_PRESENTATION) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("OORO V3") }
                        }
                        Spacer(Modifier.height(8.dp))
                        Text("This device-local choice changes presentation geometry only. The server still controls creative selection, schedule, approval, expiry and proof attribution.", color = Color(0xFFB6C0CA), fontSize = 13.sp)
                    }
                }
                TechnicianCard {
                    Text("CURRENT CONTRACT", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    TechnicianLine("Manifest layout", manifest?.layout?.name ?: "Not available")
                    TechnicianLine("Manifest contract", manifest?.layoutContractVersion?.toString() ?: "Not available")
                    TechnicianLine("Main / sponsored", "85% / 15% of advertising column in V3")
                    TechnicianLine("QR / navigation", "Each occupies half of the 20% sidebar")
                    Text("An approved sponsored item is shown only when authorized by the manifest. Otherwise, the player uses a neutral placeholder. Split layout keeps its existing geometry.", color = Color(0xFF9AA4AE), fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
                }
            }
            TechnicianSection.SETTINGS -> {
                TechnicianCard {
                    Text("OPTIONAL LOCATION ACCESS", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text(permissionState.label(), color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { contentDescription = "Location permission status: ${permissionState.label()}" })
                    Text("Location is used for live screen location reporting. Pairing, advertising playback, cached content and proofs work without it.", color = Color(0xFFB6C0CA), fontSize = 13.sp, modifier = Modifier.padding(top = 5.dp))
                    permissionMessage?.let { Text(it, color = Color(0xFFFFC46B), fontSize = 12.sp, modifier = Modifier.padding(top = 5.dp)) }
                    Spacer(Modifier.height(8.dp))
                    when (permissionState) {
                        OptionalLocationState.GRANTED -> Text("Location permission is currently allowed by Android.", color = Color(0xFF7CE0A2), fontSize = 12.sp)
                        OptionalLocationState.UNAVAILABLE -> Text("This board reports no supported location feature.", color = Color(0xFF9AA4AE), fontSize = 12.sp)
                        OptionalLocationState.NOT_REQUESTED -> OutlinedButton(onClick = onRequestLocation, modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Request optional location permission" }) { Text("ALLOW LOCATION", color = Yellow) }
                        OptionalLocationState.DENIED -> OutlinedButton(onClick = onRequestLocation, modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Request optional location permission again" }) { Text("TRY LOCATION AGAIN", color = Yellow) }
                        OptionalLocationState.PERMANENTLY_DENIED -> OutlinedButton(onClick = onOpenAppSettings, modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Open Android app settings to allow location" }) { Text("OPEN ANDROID APP SETTINGS", color = Yellow) }
                    }
                    TechnicianLine("GPS provider", if (location.gps) "Enabled" else "Disabled")
                    TechnicianLine("Network provider", if (location.network) "Enabled" else "Disabled")
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TechnicianCard(Modifier.weight(1f)) {
                        Text("NETWORK & API", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        TechnicianLine("Transport", network.type)
                        TechnicianLine("Internet", if (network.internet) "Available" else "Unavailable")
                        TechnicianLine("API", if (apiOk) "Connected" else diagnostics.lastDiagnosis ?: "Not checked")
                        TechnicianLine("Last heartbeat", relativeTime(diagnostics.heartbeatLastSuccessAt))
                        TechnicianLine("Map tiles", if (mapTilesRendered) "Rendered" else mapTileError ?: "No active map render")
                    }
                    TechnicianCard(Modifier.weight(1f)) {
                        Text("STORAGE & DEVICE", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        TechnicianLine("Cache size", "${storage.third / (1024 * 1024)} MB")
                        TechnicianLine("Free app storage", "${storage.second / (1024 * 1024)} MB")
                        TechnicianLine("Screen Player", "${BuildConfig.VERSION_NAME} · ${BuildConfig.VERSION_CODE}")
                        TechnicianLine("Backend", backendEnvironment())
                        TechnicianLine("Mock backend", if (BuildConfig.USE_MOCK_BACKEND) "Enabled" else "Disabled")
                        TechnicianLine("DeviceOS Agent", if (agentInstalled) "Installed" else "Not detected")
                        Text("THERMAL SENSORS", color = Color(0xFF9AA4AE), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 7.dp))
                        if (thermalSensors.isEmpty()) Text("No readable system sensors", color = Color(0xFFB6C0CA), fontSize = 11.sp)
                        else thermalSensors.forEach { Text(it, color = Color(0xFFB6C0CA), fontSize = 11.sp, maxLines = 1) }
                        Text("Sensor values are informational. Manufacturer safe limits are unknown here; this is not a safety certification.", color = Color(0xFFFFC46B), fontSize = 11.sp, modifier = Modifier.padding(top = 3.dp))
                    }
                }
                TechnicianCard {
                    Text("PAIRING & RECOVERY", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { contentDescription = "Pairing and recovery controls" })
                    TechnicianLine("Device", vm.deviceId)
                    TechnicianLine("Screen", if (vm.isPaired) vm.screenId else "Not paired")
                    Text("Reconnect and repair are separate actions. Repair keeps its existing technician-code gate; this dashboard will not replace the screen identity automatically.", color = Color(0xFFB6C0CA), fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                        OutlinedButton(onClick = { vm.runDiagnostics() }, enabled = !diagnostics.running, modifier = Modifier.heightIn(min = 48.dp)) { Text("RUN DIAGNOSTICS") }
                        OutlinedButton(onClick = { val clip = android.content.ClipData.newPlainText("OORO diagnostic", vm.diagnosticReport()); context.getSystemService(android.content.ClipboardManager::class.java)?.setPrimaryClip(clip) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("COPY REPORT") }
                        Button(onClick = onRepair, modifier = Modifier.heightIn(min = 48.dp)) { Text("REPAIR…") }
                    }
                }
            }
        }
    }
}

@Composable private fun TechnicianCard(modifier: Modifier = Modifier, containerColor: Color = Panel, content: @Composable ColumnScope.() -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = containerColor), shape = RoundedCornerShape(17.dp), border = BorderStroke(1.dp, Color(0xFF222A32)), modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp), content = content)
    }
}

@Composable private fun StatusChip(label: String, accent: Color) {
    Surface(color = accent.copy(alpha = 0.12f), shape = RoundedCornerShape(50), border = BorderStroke(1.dp, accent.copy(alpha = 0.36f))) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(6.dp).clip(RoundedCornerShape(50)).background(accent))
            Text(label, color = accent, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.6.sp, maxLines = 1)
        }
    }
}

@Composable private fun SetupStep(number: String, label: String) {
    Surface(color = Color(0xFF11161C), shape = RoundedCornerShape(10.dp), border = BorderStroke(1.dp, Color(0xFF242C34))) {
        Row(Modifier.padding(horizontal = 9.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(number, color = Yellow, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            Text(label, color = Muted, fontSize = 10.sp, maxLines = 1)
        }
    }
}

@Composable private fun SetupMessage(message: String) {
    val error = message.contains("failed", true) || message.contains("invalid", true) || message.contains("unable", true)
    Surface(color = (if (error) Color(0xFFFFC46B) else Color(0xFF71D6A0)).copy(alpha = 0.10f), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
        Text(message, color = if (error) Color(0xFFFFC46B) else Color(0xFF71D6A0), fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(11.dp))
    }
}

@Composable private fun TechnicianMetric(title: String, value: String, detail: String, healthy: Boolean, modifier: Modifier = Modifier) {
    TechnicianCard(modifier) {
        Text(title, color = Color(0xFF9AA4AE), fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        Text(value, color = if (healthy) Color.White else Color(0xFFFFC46B), fontSize = 17.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        Text(detail, color = Color(0xFF9AA4AE), fontSize = 11.sp, maxLines = 1)
    }
}

@Composable private fun TechnicianLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Color(0xFF9AA4AE), fontSize = 12.sp, modifier = Modifier.weight(1f))
        Text(value, color = Color.White, fontSize = 12.sp, modifier = Modifier.weight(1f), maxLines = 2)
    }
}

@Composable private fun TechnicianNotice(title: String, message: String, accent: Color) {
    TechnicianCard {
        Text(title, color = accent, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Text(message, color = Color(0xFFB6C0CA), fontSize = 12.sp)
    }
}

@Composable private fun TechnicianLayoutPreview(modifier: Modifier = Modifier) {
    TechnicianCard(modifier) {
        Text("V3 PRESENTATION PREVIEW", color = Yellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth().height(230.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF050607)).padding(8.dp)) {
            Column(Modifier.weight(0.8f).fillMaxHeight().padding(end = 5.dp)) {
                Box(Modifier.weight(0.85f).fillMaxWidth().clip(RoundedCornerShape(6.dp)).background(Color(0xFF252B32)), contentAlignment = Alignment.Center) {
                    Text("MAIN AD\nFIT / CONTAIN", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
                Spacer(Modifier.height(5.dp))
                Box(Modifier.weight(0.15f).fillMaxWidth().clip(RoundedCornerShape(5.dp)).background(Color(0xFF3D3514)), contentAlignment = Alignment.Center) {
                    Text("SPONSORED · AUTHORIZED OR NEUTRAL", color = Yellow, fontSize = 9.sp, maxLines = 1)
                }
            }
            Column(Modifier.weight(0.2f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Box(Modifier.weight(0.5f).fillMaxWidth().clip(RoundedCornerShape(6.dp)).background(Color(0xFF222830)), contentAlignment = Alignment.Center) { Text("QR / OFFER", color = Color.White, fontSize = 10.sp) }
                Box(Modifier.weight(0.5f).fillMaxWidth().clip(RoundedCornerShape(6.dp)).background(Color(0xFF1B252B)), contentAlignment = Alignment.Center) { Text("MAP / NAV", color = Color.White, fontSize = 10.sp) }
            }
        }
        Text("80% advertising column · 20% combined sidebar · no news ticker", color = Color(0xFFB6C0CA), fontSize = 11.sp)
    }
}

private fun OptionalLocationState.label(): String = when (this) {
    OptionalLocationState.GRANTED -> "Allowed"
    OptionalLocationState.NOT_REQUESTED -> "Not requested"
    OptionalLocationState.DENIED -> "Not granted"
    OptionalLocationState.PERMANENTLY_DENIED -> "Blocked by Android settings"
    OptionalLocationState.UNAVAILABLE -> "Unavailable on this device"
}

private fun readThermalSensors(): List<String> = runCatching {
    File("/sys/class/thermal").listFiles().orEmpty()
        .filter { it.name.startsWith("thermal_zone") }
        .take(16)
        .mapNotNull { zone ->
            val type = runCatching { File(zone, "type").readText().trim() }.getOrNull()?.takeIf(String::isNotBlank) ?: zone.name
            val raw = runCatching { File(zone, "temp").readText().trim().toLong() }.getOrNull() ?: return@mapNotNull null
            val celsius = if (kotlin.math.abs(raw) >= 1_000L) raw / 1_000.0 else raw.toDouble()
            "$type · ${"%.1f".format(java.util.Locale.ROOT, celsius)} °C"
        }
}.getOrDefault(emptyList())

@Composable private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) { Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp), content = { Text(title, color = Yellow, fontSize = 13.sp, fontWeight = FontWeight.Bold); Spacer(Modifier.height(6.dp)); content() }) } }
@Composable private fun StatusCard(title: String, value: String, color: Color) { Card(colors = CardDefaults.cardColors(containerColor = Panel), modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Text(title, color = Yellow, fontSize = 12.sp); Text(value, color = color, fontSize = 20.sp, fontWeight = FontWeight.Bold) } } }
@Composable private fun Line(label: String, value: String) { Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = Color.LightGray, fontSize = 13.sp); Text(value, color = Color.White, fontSize = 13.sp) } }
@Composable private fun StatusText(label: String, value: String, ok: Boolean) { Column { Text(label, color = Color.Gray, fontSize = 10.sp); Text(value, color = if (ok) Color(0xFF63D68A) else Color(0xFFFFB74D), fontSize = 12.sp) } }
private fun passFail(value: Boolean?) = when (value) { true -> "PASS"; false -> "FAIL"; null -> "N/A" }
