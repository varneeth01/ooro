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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
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
import com.google.zxing.MultiFormatWriter
import com.ooro.screenplayer.kiosk.OoroDeviceAdminReceiver
import com.ooro.screenplayer.model.*
import com.ooro.screenplayer.player.Media3CreativePlayer
import org.maplibre.android.annotations.Marker
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.tile.TileOperation
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
internal fun backendEnvironment(): String = when {
    BuildConfig.USE_MOCK_BACKEND -> "LOCAL MOCK"
    BuildConfig.API_BASE_URL.startsWith("http://127.0.0.1") || BuildConfig.API_BASE_URL.startsWith("http://localhost") -> "LOCAL TEST BACKEND"
    BuildConfig.API_BASE_URL.contains("staging", ignoreCase = true) -> "STAGING"
    BuildConfig.API_BASE_URL.startsWith("https://") -> "PRODUCTION"
    else -> "UNKNOWN"
}
internal fun isRepairAccessCode(value: String, configuredCode: String = BuildConfig.REPAIR_ACCESS_CODE): Boolean = value.filter(Char::isDigit) == configuredCode && configuredCode.isNotBlank()
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
    val playbackOffset by vm.playbackOffset.collectAsState()
    val scheduledItem = remember(manifest, playbackOffset) { vm.currentItem(manifest, playbackOffset) }
    val presentationItem by vm.currentCreative.collectAsState()
    val item = scheduledItem
    Box(Modifier.fillMaxSize().background(Color.Black).clickable { taps++; if (taps >= 7) vm.showAdmin() }) {
        if (manifest.layout == DisplayLayout.FOUR_ZONE || manifest.layout == DisplayLayout.AD_NAV_OFFER) Row(Modifier.fillMaxSize()) {
            Column(Modifier.weight(manifest.layoutConfig.safePrimaryWidth.toFloat())) {
                Box(Modifier.weight(manifest.layoutConfig.safeAdHeight.toFloat())) { PrimaryAdRegion(vm, manifest, Modifier.fillMaxSize(), item, playbackOffset) }
                NewsTicker(manifest.news, Modifier.weight((100 - manifest.layoutConfig.safeAdHeight).toFloat()))
            }
            Column(Modifier.weight((100 - manifest.layoutConfig.safePrimaryWidth).toFloat())) {
                    Box(Modifier.weight(manifest.layoutConfig.safeQrHeight.toFloat())) { OfferPanel(presentationItem, Modifier.fillMaxSize()) }
                Box(Modifier.weight((100 - manifest.layoutConfig.safeQrHeight).toFloat())) { NavigationPanel(vm, Modifier.fillMaxSize()) }
            }
        } else if (manifest.layout == DisplayLayout.SPLIT_50_25_25) Row(Modifier.fillMaxSize()) { Box(Modifier.weight(3f)) { PrimaryAdRegion(vm, manifest, Modifier.fillMaxSize(), item, playbackOffset) }; Column(Modifier.weight(1f)) { NavigationPanel(vm, Modifier.weight(1f)); OfferPanel(item, Modifier.weight(1f)) } } else PrimaryAdRegion(vm, manifest, Modifier.fillMaxSize(), item, playbackOffset)
    }
}

@Composable private fun NewsTicker(news: NewsConfig, modifier: Modifier) {
    val announcements = remember(news.announcements) { news.announcements.sortedWith(compareByDescending<NewsAnnouncement> { it.priority }.thenBy { it.id }) }
    val message = announcements.joinToString("   •   ") { it.text.trim() }.ifBlank { "OORO" }
    val offset = remember(message) { Animatable(0f) }
    val density = androidx.compose.ui.platform.LocalDensity.current
    val estimatedWidth = with(density) { (message.length * 9).dp.toPx() }
    LaunchedEffect(message, news.scrollSpeed, estimatedWidth) {
        if (announcements.isEmpty()) { offset.snapTo(0f); return@LaunchedEffect }
        val segment = estimatedWidth.coerceAtLeast(with(density) { 160.dp.toPx() })
        val duration = (segment / news.scrollSpeed.coerceIn(10, 120) * 1000).toInt().coerceIn(8_000, 45_000)
        while (true) {
            offset.snapTo(0f)
            offset.animateTo(-segment, tween(duration))
        }
    }
    Box(modifier.background(Color(0xFF1C232A)).padding(horizontal = 18.dp), contentAlignment = Alignment.CenterStart) {
        if (announcements.isEmpty()) Text("OORO", color = Color.LightGray, fontSize = 14.sp, maxLines = 1)
        else Row(Modifier.graphicsLayer { translationX = offset.value }) {
            Text(message, color = Color.White, fontSize = 16.sp, maxLines = 1)
            Spacer(Modifier.width(with(density) { estimatedWidth.toDp().coerceAtLeast(160.dp) }))
            Text(message, color = Color.White, fontSize = 16.sp, maxLines = 1)
        }
    }
}

@Composable private fun PrimaryAdRegion(vm: ScreenViewModel, manifest: DeviceManifest, modifier: Modifier, selectedItem: ManifestItem? = vm.currentItem(manifest), playbackKey: Int = 0) {
    val item = selectedItem; var path by remember(item?.id, playbackKey) { mutableStateOf<String?>(null) }; LaunchedEffect(item?.id, playbackKey) { path = item?.let { vm.localFile(it) } }
    Box(modifier.background(Color.Black), contentAlignment = Alignment.Center) {
        if (item == null || path == null) Text("OORO\nContent will resume shortly", color = Color.White, fontSize = 24.sp)
        else if (item.type == CreativeType.IMAGE) { val bitmap = remember(path, playbackKey) { path?.let(BitmapFactory::decodeFile) }; if (bitmap != null) { LaunchedEffect(item.id, playbackKey) { vm.creativeStarted(item); kotlinx.coroutines.delay(item.durationSeconds * 1000L); vm.creativeFinished(item, item.durationSeconds * 1000L, true) }; Image(bitmap.asImageBitmap(), "OORO creative", Modifier.fillMaxSize(), contentScale = item.fitMode.toContentScale()) } else LaunchedEffect(item.id, playbackKey) { vm.creativeStarted(item); vm.creativeFinished(item, 0, false, "IMAGE_DECODE_FAILED") } }
        else {
            val context = LocalContext.current
            val creative = remember(item.id, playbackKey) {
                Log.i("OoroScreen", "media player created creativeId=${item.creativeId} itemId=${item.id} key=$playbackKey")
                Media3CreativePlayer(context, { vm.creativeStarted(item) }, { ms -> vm.creativeFinished(item, ms, true) }, { e -> vm.creativeFinished(item, creativeDuration(item), false, e.message) }, { }, { position -> vm.creativePosition(item, position) })
            }
            DisposableEffect(path, playbackKey) {
                creative.play(path!!)
                onDispose {
                    if (creative.player.isPlaying) vm.creativeFinished(item, creative.player.currentPosition, false, "INTERRUPTED")
                    creative.close()
                    Log.i("OoroScreen", "media player released creativeId=${item.creativeId} itemId=${item.id} key=$playbackKey")
                }
            }
            AndroidView(
                factory = { context -> PlayerView(context).apply { useController = false; resizeMode = item.fitMode.toResizeMode(); Log.i("OoroScreen", "video surface created creativeId=${item.creativeId} itemId=${item.id}") } },
                modifier = Modifier.fillMaxSize(),
                update = { view ->
                    if (view.player !== creative.player) Log.i("OoroScreen", "video surface rebound creativeId=${item.creativeId} itemId=${item.id}")
                    view.player = creative.player
                    view.resizeMode = item.fitMode.toResizeMode()
                },
                onRelease = { view -> view.player = null; Log.i("OoroScreen", "video surface released creativeId=${item.creativeId} itemId=${item.id}") }
            )
        }
    }
}
private fun FitMode.toContentScale() = when (this) { FitMode.FILL, FitMode.CENTER_CROP -> ContentScale.Crop; FitMode.FIT -> ContentScale.Fit }
private fun FitMode.toResizeMode() = when (this) { FitMode.FILL, FitMode.CENTER_CROP -> androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM; FitMode.FIT -> androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT }
private fun creativeDuration(item: ManifestItem) = item.durationSeconds * 1000L

@Composable private fun NavigationPanel(vm: ScreenViewModel, modifier: Modifier) { val nav by vm.navigation.collectAsState(); Box(modifier.background(Panel).padding(4.dp)) { MapPanel(vm, nav, Modifier.fillMaxSize()); Text("▲", color = Yellow, fontSize = 22.sp, modifier = Modifier.align(Alignment.Center)); if (nav.active && (nav.nextInstruction ?: nav.destinationName) != null) Text(nav.nextInstruction ?: nav.destinationName.orEmpty(), color = Color.White, fontSize = 12.sp, maxLines = 1, modifier = Modifier.align(Alignment.TopStart).background(Color(0xAA121820)).padding(horizontal = 6.dp, vertical = 4.dp)) } }
@Composable private fun MapPanel(vm: ScreenViewModel, nav: NavigationState, modifier: Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var mapView by remember { mutableStateOf<MapView?>(null) }
    var vehicleMarker by remember { mutableStateOf<Marker?>(null) }
    var mapLoaded by remember { mutableStateOf(false) }
    var mapError by remember { mutableStateOf<String?>(null) }
    var lastCameraTarget by remember { mutableStateOf<LatLng?>(null) }

    val currentMapView by rememberUpdatedState(mapView)
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> currentMapView?.onStart()
                Lifecycle.Event.ON_RESUME -> currentMapView?.onResume()
                Lifecycle.Event.ON_PAUSE -> currentMapView?.onPause()
                Lifecycle.Event.ON_STOP -> currentMapView?.onStop()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val latitude = nav.currentLatitude
    val longitude = nav.currentLongitude
    LaunchedEffect(map) {
        if (map == null) return@LaunchedEffect
        vm.reportMapHealth(false, null)
        kotlinx.coroutines.delay(5_000)
        if (!mapLoaded) {
            mapError = mapError ?: "Map tiles unavailable"
            vm.reportMapHealth(false, mapError)
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
        } else if (kotlin.math.abs(previous.latitude - lat) > 0.0003 || kotlin.math.abs(previous.longitude - lon) > 0.0003) {
            readyMap.easeCamera(CameraUpdateFactory.newLatLngZoom(target, 14.0), 700)
        }
        lastCameraTarget = target
    }

    Box(modifier.background(Color(0xFF263238))) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { MapView(context).also { createdMapView ->
                mapView = createdMapView
                createdMapView.onCreate(null)
                createdMapView.onStart()
                createdMapView.onResume()
                createdMapView.addOnTileActionListener { operation, _, _, _, _, _, reason ->
                    when (operation) {
                        TileOperation.LoadFromNetwork, TileOperation.LoadFromCache -> {
                            mapLoaded = true
                            mapError = null
                            vm.reportMapHealth(true, null)
                            Log.i("OoroScreen", "MAP_TILE_LOADED operation=$operation provider=MapLibre source=OpenStreetMap")
                        }
                        TileOperation.Error -> {
                            mapLoaded = false
                            mapError = reason.take(160).ifBlank { "Map tiles unavailable" }
                            vm.reportMapHealth(false, mapError)
                            Log.w("OoroScreen", "MAP_TILE_ERROR reason=$mapError")
                        }
                        else -> Unit
                    }
                }
                createdMapView.addOnDidFailLoadingMapListener { reason ->
                    mapLoaded = false
                    mapError = reason.take(160).ifBlank { "Map tiles unavailable" }
                    vm.reportMapHealth(false, mapError)
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
                releasedMapView.onPause()
                releasedMapView.onStop()
                releasedMapView.onDestroy()
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

@Composable private fun OfferPanel(item: ManifestItem?, modifier: Modifier) {
    val offer = item?.offer ?: OfferMetadata()
    val qr = remember(item?.id, offer.validQrUrl) { offer.validQrUrl?.let(::qrBitmap) }
    val promotionalText = offer.promotionalText?.trim().takeIf { !it.isNullOrBlank() }
    val brandName = offer.brandName?.trim().takeIf { !it.isNullOrBlank() }
    BoxWithConstraints(modifier.background(Color(0xFF20252B)).padding(horizontal = 10.dp, vertical = 6.dp)) {
        val panelWidth = maxWidth
        val panelHeight = maxHeight
        Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(0.48f).padding(end = 8.dp), verticalArrangement = Arrangement.Center) {
                if (promotionalText != null) {
                    Text(promotionalText, color = Yellow, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 2)
                    if (brandName != null) Text(brandName, color = Color.White, fontSize = 14.sp, maxLines = 2)
                } else if (brandName != null) {
                    Text(brandName, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold, maxLines = 2)
                } else if (qr == null) {
                    Text("OORO", color = Yellow, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }
                if (qr != null && !offer.ctaLabel.isNullOrBlank()) Text(offer.ctaLabel!!.trim(), color = Color(0xFFB8C0C8), fontSize = 11.sp, maxLines = 2, modifier = Modifier.padding(top = 5.dp))
            }
            Box(Modifier.weight(0.52f).fillMaxHeight(), contentAlignment = Alignment.CenterEnd) {
                if (qr != null) {
                    val qrSize = minOf(panelWidth * 0.46f, panelHeight * 0.88f)
                    Image(qr.asImageBitmap(), "Advertisement QR code", Modifier.size(qrSize), contentScale = ContentScale.Fit)
                }
            }
        }
    }
}
private fun qrBitmap(value: String): Bitmap? = runCatching { val matrix = MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, 512, 512); Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888).also { bitmap -> for (x in 0 until 512) for (y in 0 until 512) bitmap.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE) } }.getOrNull()
@Composable private fun Admin(vm: ScreenViewModel) {
    var repairCodeDialog by remember { mutableStateOf(false) }; var repairCode by remember { mutableStateOf("") }; var repairCodeError by remember { mutableStateOf<String?>(null) }
    val d by vm.diagnostics.collectAsState(); val mapTilesRendered by vm.mapTilesRendered.collectAsState(); val mapTileError by vm.mapTileError.collectAsState(); val context = LocalContext.current; val n = networkInfo(context); val l = locationDiagnostics(context); val c = vm.deviceId
    val apiOk = d.probe?.connected == true; val issues = listOf(!apiOk, !l.permission || (!l.gps && !l.network), d.missingAssets > 0, d.proofQueued > 0).count { it }
    LazyColumn(Modifier.fillMaxSize().background(Color(0xFF101010)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text("TECHNICAL DIAGNOSTICS", color = Yellow, fontSize = 24.sp, fontWeight = FontWeight.Bold); Text("OORO SCREEN  •  $c", color = Color.LightGray); Spacer(Modifier.height(4.dp)); StatusCard("SYSTEM HEALTH", if (issues == 0) "ALL SYSTEMS OPERATIONAL" else "$issues ISSUES DETECTED", if (issues == 0) Color(0xFF63D68A) else Color(0xFFFFB74D)) }
        item { Section("OVERVIEW") { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { StatusText("DEVICE", if (vm.online) "ONLINE" else "OFFLINE", vm.online); StatusText("API", if (apiOk) "CONNECTED" else "UNREACHABLE", apiOk); StatusText("PAIRING", if (vm.isPaired) "PAIRED" else "UNPAIRED", vm.isPaired); StatusText("GPS", if (l.permission && (l.gps || l.network)) "AVAILABLE" else "SEARCHING", l.permission) } } }
        item { Section("CONNECTION") { Line("API Base URL", BuildConfig.API_BASE_URL); Line("Environment", backendEnvironment()); Line("Mock backend", if (BuildConfig.USE_MOCK_BACKEND) "ON" else "OFF"); Line("API status", if (apiOk) "CONNECTED" else "UNREACHABLE"); Line("Database-backed API", if (d.probe?.httpStatus == 200) "HEALTHY" else "UNKNOWN"); Line("Map tiles", if (mapTilesRendered) "RENDERED" else if (mapTileError != null) "UNAVAILABLE" else "CHECKING"); Line("GPS fix", if (l.permission && (l.gps || l.network)) "AVAILABLE" else "UNAVAILABLE"); Line("Last successful API", relativeTime(d.apiLastSuccessAt)); d.apiLastError?.let { Text("Last API error: $it", color = Color(0xFFFFB74D), modifier = Modifier.padding(top = 4.dp)) }; mapTileError?.let { Text("Map error: $it", color = Color(0xFFFFB74D), fontSize = 12.sp) }; Text("DNS ${passFail(d.probe?.dns)}   TCP ${passFail(d.probe?.tcp)}   ${d.probe?.httpStatus?.let { "HTTP $it" } ?: "HTTP —"}   ${d.probe?.latencyMs?.let { "${it} ms" } ?: ""}", color = Color.LightGray); d.probe?.failureKind?.let { Text("Diagnostic: $it", color = Color(0xFFFFB74D), fontSize = 12.sp) }; Button({ vm.runDiagnostics() }, enabled = !d.running, modifier = Modifier.padding(top = 6.dp)) { Text(if (d.running) "RUNNING…" else "TEST API CONNECTION") } } }
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
