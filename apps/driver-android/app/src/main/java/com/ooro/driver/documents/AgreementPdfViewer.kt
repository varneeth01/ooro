package com.ooro.driver.documents

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

@Composable
fun AgreementPdfViewer(contentUrl: String?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var page by remember { mutableIntStateOf(0) }
    var pageCount by remember { mutableIntStateOf(0) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(contentUrl, page) {
        if (contentUrl.isNullOrBlank()) { error = "The agreement document is not available yet."; return@LaunchedEffect }
        runCatching {
            withContext(Dispatchers.IO) {
                val file = File(context.cacheDir, "agreement-viewer-${contentUrl.hashCode()}.pdf")
                if (!file.exists()) URL(contentUrl).openConnection().let { connection ->
                    (connection as HttpURLConnection).apply { connectTimeout = 10_000; readTimeout = 15_000 }.also { response ->
                        check(response.responseCode in 200..299) { "Agreement download failed (${response.responseCode})" }
                    }.inputStream.use { input -> file.outputStream().use(input::copyTo) }
                }
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                    PdfRenderer(descriptor).use { renderer ->
                        pageCount = renderer.pageCount
                        val safePage = page.coerceIn(0, (renderer.pageCount - 1).coerceAtLeast(0))
                        renderer.openPage(safePage).use { pdfPage ->
                            Bitmap.createBitmap(pdfPage.width, pdfPage.height, Bitmap.Config.ARGB_8888).also { rendered ->
                                rendered.eraseColor(Color.WHITE)
                                pdfPage.render(rendered, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                                bitmap = rendered
                            }
                        }
                    }
                }
            }
            error = null
        }.onFailure { error = it.message ?: "Agreement document could not be opened" }
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        when {
            bitmap != null -> Image(bitmap!!.asImageBitmap(), "Agreement page ${page + 1}", Modifier.fillMaxWidth().heightIn(max = 560.dp))
            error != null -> Text(error!!)
            else -> CircularProgressIndicator()
        }
        if (pageCount > 1) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton({ page = (page - 1).coerceAtLeast(0) }, enabled = page > 0) { Text("‹") }
            Text("Page ${page + 1} of $pageCount", Modifier.padding(top = 12.dp))
            IconButton({ page = (page + 1).coerceAtMost(pageCount - 1) }, enabled = page + 1 < pageCount) { Text("›") }
        }
    }
}
