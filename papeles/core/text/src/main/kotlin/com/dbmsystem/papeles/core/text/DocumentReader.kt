package com.dbmsystem.papeles.core.text

import android.content.Context
import android.net.Uri
import com.dbmsystem.papeles.core.model.TextPage
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/** What the user handed in: a PDF (picked or shared) or the images of a photo or a scan. */
sealed interface DocumentInput {
    data class Pdf(
        val uri: Uri,
    ) : DocumentInput

    data class Images(
        val uris: List<Uri>,
    ) : DocumentInput
}

sealed interface ReadResult {
    data class Read(
        val pages: List<TextPage>,
    ) : ReadResult

    data class Failed(
        val reason: ReadFailure,
    ) : ReadResult
}

enum class ReadFailure {
    PASSWORD_PROTECTED,
    UNREADABLE,
}

interface DocumentReader {
    suspend fun read(input: DocumentInput): ReadResult
}

/**
 * Copies the input to app-private storage (shared URIs can be temporary or not seekable), reads its text and deletes
 * the copy. Nothing leaves the device, and nothing of the document is logged (CLAUDE.md, rules 1 and 7).
 */
class LocalDocumentReader
    @Inject
    constructor(
        @ApplicationContext private val context: Context,
        private val extractor: TextExtractor,
    ) : DocumentReader {
        override suspend fun read(input: DocumentInput): ReadResult =
            withContext(Dispatchers.IO) {
                val copies = mutableListOf<File>()
                try {
                    val pages =
                        when (input) {
                            is DocumentInput.Pdf -> extractor.fromPdf(copy(input.uri).also(copies::add))
                            is DocumentInput.Images ->
                                extractor.fromImages(
                                    input.uris.map { copy(it).also(copies::add) },
                                )
                        }
                    ReadResult.Read(pages)
                } catch (e: CancellationException) {
                    throw e
                } catch (e: InvalidPasswordException) {
                    ReadResult.Failed(ReadFailure.PASSWORD_PROTECTED)
                } catch (e: Exception) {
                    ReadResult.Failed(ReadFailure.UNREADABLE)
                } finally {
                    copies.forEach(File::delete)
                }
            }

        private fun copy(uri: Uri): File {
            val directory = File(context.cacheDir, INBOX).apply { mkdirs() }
            val file = File(directory, UUID.randomUUID().toString())
            val input = context.contentResolver.openInputStream(uri) ?: throw IOException("Cannot open the input.")
            input.use { source -> file.outputStream().use { source.copyTo(it) } }
            return file
        }

        private companion object {
            const val INBOX = "inbox"
        }
    }
