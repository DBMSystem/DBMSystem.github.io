package com.dbmsystem.papeles

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.Modifier
import androidx.core.content.IntentCompat
import com.dbmsystem.papeles.core.text.DocumentInput
import com.dbmsystem.papeles.feature.capture.CaptureScreen
import com.dbmsystem.papeles.feature.capture.CaptureViewModel
import com.dbmsystem.papeles.feature.capture.PDF_MIME_TYPE
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val captureViewModel: CaptureViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // On recreation (e.g. rotation) the shared PDF has already been handed over.
        if (savedInstanceState == null) readSharedPdf(intent)
        setContent {
            MaterialTheme(colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()) {
                Scaffold { padding ->
                    CaptureScreen(modifier = Modifier.padding(padding), viewModel = captureViewModel)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        readSharedPdf(intent)
    }

    /** A PDF opened with the app (ACTION_VIEW) or shared to it (ACTION_SEND). */
    private fun readSharedPdf(intent: Intent) {
        val uri =
            when (intent.action) {
                Intent.ACTION_VIEW -> intent.data
                Intent.ACTION_SEND -> IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
                else -> null
            }
        if (uri != null && intent.type == PDF_MIME_TYPE) captureViewModel.read(DocumentInput.Pdf(uri))
    }
}
