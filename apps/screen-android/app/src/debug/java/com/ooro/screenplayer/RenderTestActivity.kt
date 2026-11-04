package com.ooro.screenplayer

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.Debug
import android.util.Log
import android.view.FrameMetrics
import android.view.Window
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.ooro.screenplayer.model.CreativeType
import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.LayoutConfig
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.model.NavigationState
import com.ooro.screenplayer.model.NewsAnnouncement
import com.ooro.screenplayer.model.NewsConfig
import com.ooro.screenplayer.model.OfferMetadata
import java.io.File
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.lifecycle.lifecycleScope
import java.util.concurrent.atomic.AtomicLong
import androidx.compose.foundation.gestures.detectTapGestures

private data class PreviewAsset(val name: String, val width: Int, val height: Int, val video: Boolean = false)

class RenderTestActivity : ComponentActivity() {
    private lateinit var previewDirectory: File
    private var frameListener: Window.OnFrameMetricsAvailableListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).hide(WindowInsetsCompat.Type.systemBars())
        previewDirectory = File(cacheDir, "render-test-preview-${android.os.SystemClock.elapsedRealtimeNanos()}")
        check(copyAssets(previewDirectory)) { "Debug render test assets are missing" }
        Log.i("OoroRenderTest", "offline preview started proofsDisabled=true networkManifestDisabled=true")
        setContent {
            MaterialTheme(colorScheme = androidx.compose.material3.darkColorScheme(primary = Color(0xFFF5C400))) {
                RenderTestScreen(
                    previewDirectory.absolutePath,
                    initialAsset = intent.getStringExtra("asset"),
                    initialLayout = intent.getStringExtra("layout"),
                    controlsInitiallyVisible = intent.getBooleanExtra("controls", false),
                    initialMapEnabled = intent.getBooleanExtra("map", false),
                    initialTickerEnabled = intent.getBooleanExtra("ticker", false),
                    initialQrEnabled = intent.getBooleanExtra("qr", false)
                )
            }
        }
        if (intent.getBooleanExtra("diagnostics", false)) startBoundedDiagnostics()
    }

    private fun startBoundedDiagnostics() {
        val counterStart = RuntimeDiagnostics.capture()
        val pssBeforeKb = Debug.getPss()
        val startedAt = SystemClock.elapsedRealtime()
        val frameCount = AtomicLong()
        val slowFrames = AtomicLong()
        val droppedFrames = AtomicLong()
        val handler = Handler(Looper.getMainLooper())
        if (android.os.Build.VERSION.SDK_INT >= 24) {
            frameListener = Window.OnFrameMetricsAvailableListener { _, metrics, dropped ->
                frameCount.incrementAndGet()
                droppedFrames.addAndGet(dropped.toLong())
                if (metrics.getMetric(FrameMetrics.TOTAL_DURATION) > 16_666_667L) slowFrames.incrementAndGet()
            }
            window.addOnFrameMetricsAvailableListener(frameListener!!, handler)
        }
        lifecycleScope.launch {
            val beforeThreads = threadCpuTicks()
            delay(5_000)
            frameListener?.let(window::removeOnFrameMetricsAvailableListener)
            frameListener = null
            val afterThreads = threadCpuTicks()
            val elapsed = (SystemClock.elapsedRealtime() - startedAt).coerceAtLeast(1)
            val pssAfterKb = Debug.getPss()
            val threadDeltas = afterThreads.mapNotNull { (name, ticks) ->
                val delta = ticks - (beforeThreads[name] ?: ticks)
                if (delta > 0) "$name:$delta" else null
            }.sortedByDescending { entry -> entry.substringAfter(':').toLongOrNull() ?: 0L }.take(12)
            Log.i("OoroPerfDiag", "sampleMs=$elapsed pssBeforeKb=$pssBeforeKb pssAfterKb=$pssAfterKb frames=${frameCount.get()} slowFrames=${slowFrames.get()} dropped=${droppedFrames.get()} threadCpuTicks=${threadDeltas.joinToString(",")} counters=${RuntimeDiagnostics.formatDelta(counterStart)}")
        }
    }

    /** One-shot thread CPU tick deltas are read only for the explicit debug sample. */
    private fun threadCpuTicks(): Map<String, Long> = runCatching {
        File("/proc/self/task").listFiles().orEmpty().mapNotNull { task ->
            val stat = File(task, "stat").readText()
            val close = stat.lastIndexOf(')')
            if (close < 0) return@mapNotNull null
            val fields = stat.substring(close + 1).trim().split(Regex("\\s+"))
            val ticks = fields.getOrNull(11)?.toLongOrNull()?.plus(fields.getOrNull(12)?.toLongOrNull() ?: 0L) ?: return@mapNotNull null
            val name = runCatching { File(task, "comm").readText().trim() }.getOrDefault(task.name)
            name to ticks
        }.toMap()
    }.getOrDefault(emptyMap())

    private fun copyAssets(destination: File): Boolean = runCatching {
        destination.deleteRecursively()
        check(destination.mkdirs())
        val names = assets.list("render-test")?.toList().orEmpty()
        check(names.isNotEmpty())
        names.forEach { name -> assets.open("render-test/$name").use { input -> File(destination, name).outputStream().use { output -> input.copyTo(output) } } }
    }.onFailure { Log.e("OoroRenderTest", "could not prepare local preview assets", it) }.isSuccess

    override fun onDestroy() {
        frameListener?.let(window::removeOnFrameMetricsAvailableListener)
        frameListener = null
        if (::previewDirectory.isInitialized) previewDirectory.deleteRecursively()
        Log.i("OoroRenderTest", "offline preview closed; production data untouched")
        super.onDestroy()
    }
}

@Composable
private fun RenderTestScreen(
    assetDirectory: String,
    initialAsset: String?,
    initialLayout: String?,
    controlsInitiallyVisible: Boolean,
    initialMapEnabled: Boolean,
    initialTickerEnabled: Boolean,
    initialQrEnabled: Boolean
) {
    val assets = remember {
        listOf(
            PreviewAsset("landscape", 1920, 1080),
            PreviewAsset("portrait", 1080, 1920),
            PreviewAsset("square", 1200, 1200),
            PreviewAsset("ultrawide", 2560, 800),
            PreviewAsset("nonstandard", 1000, 700),
            PreviewAsset("jpeg-exif-rotated", 1080, 1920),
            PreviewAsset("video-landscape-720p", 1280, 720, video = true),
            PreviewAsset("video-portrait", 720, 1280, video = true)
        )
    }
    var selected by remember { mutableIntStateOf(assets.indexOfFirst { it.name == initialAsset }.takeIf { it >= 0 } ?: 0) }
    var layout by remember { mutableStateOf(DisplayLayout.entries.firstOrNull { it.name == initialLayout } ?: DisplayLayout.FULLSCREEN_AD) }
    var mapEnabled by remember { mutableStateOf(initialMapEnabled) }
    var tickerEnabled by remember { mutableStateOf(initialTickerEnabled) }
    var qrEnabled by remember { mutableStateOf(initialQrEnabled) }
    var controlsVisible by remember { mutableStateOf(controlsInitiallyVisible) }
    val selectedAsset = assets[selected]
    val itemList = remember(assets, qrEnabled) {
        assets.map { asset ->
            val fileName = asset.name + when { asset.video -> ".mp4"; asset.name == "jpeg-exif-rotated" -> ".jpg"; else -> ".png" }
            ManifestItem(
                id = "render-test-${asset.name}", campaignId = "local-render-test", creativeId = "local-${asset.name}",
                type = if (asset.video) CreativeType.VIDEO else CreativeType.IMAGE,
                url = "render-test://$fileName", checksum = null, durationSeconds = 60, priority = 0,
                startAt = null, endAt = null, daysOfWeek = emptySet(), startTime = null, endTime = null,
                assetId = "local-asset-${asset.name}", fitMode = FitMode.FIT,
                offer = OfferMetadata(
                    brandName = "OORO FIT TEST", promotionalText = "Edges must remain visible",
                    offerTitle = "Synthetic preview", offerValue = "FIT", ctaLabel = "TEST ONLY",
                    qrUrl = if (qrEnabled) "https://example.invalid/render-test" else null
                )
            )
        }
    }
    val news = if (tickerEnabled) NewsConfig(42, listOf(NewsAnnouncement("render-test-news", "SYNTHETIC TICKER · OFFLINE TEST", 1))) else NewsConfig()
    val manifest = DeviceManifest(
        version = 0, screenId = "LOCAL_RENDER_TEST", timezone = "UTC", items = itemList,
        validUntil = null, layout = layout, layoutConfig = LayoutConfig(67, 89, 32, 42), news = news
    )
    val paths = remember(assetDirectory, assets) {
        assets.associate { asset ->
            val fileName = asset.name + when { asset.video -> ".mp4"; asset.name == "jpeg-exif-rotated" -> ".jpg"; else -> ".png" }
            "render-test-${asset.name}" to File(assetDirectory, fileName).absolutePath
        }
    }
    val nav = NavigationState(
        active = mapEnabled, destinationName = "Synthetic navigation test",
        destinationLatitude = 13.6288, destinationLongitude = 79.4192,
        currentLatitude = 13.6288, currentLongitude = 79.4192,
        nextInstruction = "MapLibre test · no route requested"
    )
    val preview = PlayerPreviewConfig(
        itemId = "render-test-${selectedAsset.name}", assetPaths = paths, navigation = nav,
        onMapHealth = { loaded, error -> Log.i("OoroRenderTest", "map active=$mapEnabled loaded=$loaded error=${error ?: "none"}") }
    )

    LaunchedEffect(controlsVisible, selected, layout, mapEnabled, tickerEnabled, qrEnabled) {
        if (controlsVisible) { kotlinx.coroutines.delay(5_000); controlsVisible = false }
        Log.i("OoroRenderTest", "case creative=${selectedAsset.name} source=${selectedAsset.width}x${selectedAsset.height} type=${if (selectedAsset.video) "VIDEO" else "IMAGE"} layout=$layout map=$mapEnabled ticker=$tickerEnabled qr=$qrEnabled fit=FIT")
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        Player(vm = null, manifest = manifest, preview = preview)
        if (controlsVisible) {
            Surface(color = Color(0xEE101820), modifier = Modifier.align(Alignment.TopCenter).fillMaxWidth()) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Button(onClick = { selected = (selected - 1 + assets.size) % assets.size; controlsVisible = true }) { Text("Prev") }
                    Text("${selectedAsset.name} ${selectedAsset.width}×${selectedAsset.height}", color = Color.White, fontSize = 12.sp)
                    Button(onClick = { selected = (selected + 1) % assets.size; controlsVisible = true }) { Text("Next") }
                    Button(onClick = { layout = when (layout) { DisplayLayout.FULLSCREEN_AD -> DisplayLayout.FOUR_ZONE; DisplayLayout.FOUR_ZONE -> DisplayLayout.SPLIT_50_25_25; else -> DisplayLayout.FULLSCREEN_AD }; controlsVisible = true }) { Text("Layout: ${layout.name}") }
                    Button(onClick = { mapEnabled = !mapEnabled; controlsVisible = true }) { Text(if (mapEnabled) "Map ON" else "Map OFF") }
                    Button(onClick = { tickerEnabled = !tickerEnabled; controlsVisible = true }) { Text(if (tickerEnabled) "Ticker ON" else "Ticker OFF") }
                    Button(onClick = { qrEnabled = !qrEnabled; controlsVisible = true }) { Text(if (qrEnabled) "QR ON" else "QR OFF") }
                    Button(onClick = { controlsVisible = false; Log.i("OoroRenderTest", "controls hidden screenshot-ready=true") }) { Text("Hide") }
                }
            }
        } else {
            Box(Modifier.fillMaxSize().pointerInput(Unit) { detectTapGestures { controlsVisible = true } })
        }
    }
}
