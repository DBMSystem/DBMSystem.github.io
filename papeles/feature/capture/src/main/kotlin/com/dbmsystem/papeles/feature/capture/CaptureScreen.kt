package com.dbmsystem.papeles.feature.capture

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.dbmsystem.papeles.core.classify.Classification
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.Origin
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.TextSource
import com.dbmsystem.papeles.core.text.DocumentInput
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult

/** Most pages read from one scan or one selection of photos. A hypothesis, like the other limits. */
private const val MAX_PAGES = 10

@Composable
fun CaptureScreen(
    modifier: Modifier = Modifier,
    viewModel: CaptureViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val scanner =
        rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            val pages = GmsDocumentScanningResult.fromActivityResultIntent(result.data)?.pages.orEmpty()
            if (result.resultCode == Activity.RESULT_OK && pages.isNotEmpty()) {
                viewModel.read(DocumentInput.Images(pages.map { it.imageUri }))
            }
        }
    val photos =
        rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(MAX_PAGES)) { uris ->
            if (uris.isNotEmpty()) viewModel.read(DocumentInput.Images(uris))
        }
    val pdf =
        rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) viewModel.read(DocumentInput.Pdf(uri))
        }

    val startScan: () -> Unit = {
        val activity = context.findActivity()
        val options =
            GmsDocumentScannerOptions
                .Builder()
                .setGalleryImportAllowed(false)
                .setPageLimit(MAX_PAGES)
                .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
                .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
                .build()
        if (activity == null) {
            viewModel.scannerUnavailable()
        } else {
            GmsDocumentScanning
                .getClient(options)
                .getStartScanIntent(activity)
                .addOnSuccessListener { scanner.launch(IntentSenderRequest.Builder(it).build()) }
                .addOnFailureListener { viewModel.scannerUnavailable() }
        }
    }

    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(stringResource(R.string.capture_title), style = MaterialTheme.typography.headlineMedium)
        when (val current = state) {
            CaptureState.Reading -> {
                CircularProgressIndicator()
                Text(stringResource(R.string.capture_reading))
            }
            is CaptureState.AskType -> {
                Text(stringResource(R.string.capture_question), style = MaterialTheme.typography.titleLarge)
                for (option in current.classification.options) {
                    OutlinedButton(onClick = { viewModel.chooseType(option) }, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(option.label))
                    }
                }
                TextButton(onClick = { viewModel.chooseType(DocumentType.OTHER) }, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.capture_none_of_these))
                }
                ReadPages(current.pages)
            }
            is CaptureState.Read -> {
                DocumentTypeSummary(current.type, current.typeOrigin, current.classification)
                ReadPages(current.pages)
                Button(onClick = viewModel::reset, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.capture_another))
                }
            }
            CaptureState.Idle, is CaptureState.Problem -> {
                if (current is CaptureState.Problem) {
                    Text(stringResource(current.problem.message), color = MaterialTheme.colorScheme.error)
                } else {
                    Text(stringResource(R.string.capture_intro), style = MaterialTheme.typography.titleMedium)
                }
                Button(onClick = startScan, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.capture_scan))
                }
                OutlinedButton(
                    onClick = {
                        photos.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.capture_pick_photo))
                }
                OutlinedButton(onClick = { pdf.launch(arrayOf(PDF_MIME_TYPE)) }, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.capture_pick_pdf))
                }
                Text(stringResource(R.string.capture_share_hint), style = MaterialTheme.typography.bodyMedium)
                Text(stringResource(R.string.capture_privacy), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun DocumentTypeSummary(
    type: DocumentType,
    origin: Origin,
    classification: Classification,
) {
    val name = stringResource(type.label)
    if (origin == Origin.USER_CONFIRMED) {
        Text(stringResource(R.string.capture_type_confirmed, name), style = MaterialTheme.typography.titleLarge)
        return
    }
    Text(stringResource(R.string.capture_type_detected, name), style = MaterialTheme.typography.titleLarge)
    val evidence =
        classification.reasons
            .mapNotNull { it.text }
            .distinct()
            .take(MAX_REASONS_SHOWN)
    if (evidence.isNotEmpty()) {
        Text(
            stringResource(R.string.capture_type_reasons, evidence.joinToString(", ") { "«$it»" }),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

private const val MAX_REASONS_SHOWN = 3

private val DocumentType.label: Int
    get() =
        when (this) {
            DocumentType.PAYSLIP -> R.string.doc_type_payslip
            DocumentType.UTILITY_BILL -> R.string.doc_type_utility_bill
            DocumentType.PURCHASE -> R.string.doc_type_purchase
            DocumentType.SUBSCRIPTION -> R.string.doc_type_subscription
            DocumentType.INSURANCE -> R.string.doc_type_insurance
            DocumentType.VEHICLE -> R.string.doc_type_vehicle
            DocumentType.CONTRACT_DATES -> R.string.doc_type_contract_dates
            DocumentType.OTHER -> R.string.doc_type_other
        }

/** What was read, page by page, so the text step can be checked by eye until the review screen exists (M5). */
@Composable
private fun ReadPages(pages: List<TextPage>) {
    Text(
        pluralStringResource(R.plurals.capture_read_pages, pages.size, pages.size),
        style = MaterialTheme.typography.titleMedium,
    )
    for (page in pages) {
        val header =
            when (page.source) {
                TextSource.PDF_TEXT_LAYER -> R.string.capture_page_from_pdf
                TextSource.OCR -> R.string.capture_page_from_image
            }
        Text(stringResource(header, page.number), style = MaterialTheme.typography.titleSmall)
        if (page.blocks.isEmpty()) {
            Text(stringResource(R.string.capture_page_empty), style = MaterialTheme.typography.bodyMedium)
        } else {
            Text(page.text, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private val CaptureProblem.message: Int
    get() =
        when (this) {
            CaptureProblem.NO_TEXT -> R.string.capture_no_text
            CaptureProblem.PASSWORD_PROTECTED -> R.string.capture_password
            CaptureProblem.UNREADABLE -> R.string.capture_unreadable
            CaptureProblem.SCANNER_UNAVAILABLE -> R.string.capture_scanner_unavailable
        }

private tailrec fun Context.findActivity(): Activity? =
    when (this) {
        is Activity -> this
        is ContextWrapper -> baseContext.findActivity()
        else -> null
    }

const val PDF_MIME_TYPE = "application/pdf"
