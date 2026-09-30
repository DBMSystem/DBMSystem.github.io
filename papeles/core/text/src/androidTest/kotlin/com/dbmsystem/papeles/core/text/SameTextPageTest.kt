package com.dbmsystem.papeles.core.text

import android.graphics.Bitmap
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.TextSource
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.graphics.image.JPEGFactory
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import java.io.File
import kotlin.math.abs

/**
 * M2 "Listo cuando": a PDF with text, a scanned PDF and a photo of the same page produce the same TextPage: same lines
 * in the same order and boxes in the same place. Runs on a device because it uses PdfRenderer and ML Kit.
 */
@RunWith(AndroidJUnit4::class)
class SameTextPageTest {
    @get:Rule
    val folder = TemporaryFolder()

    private val config = TextExtractionConfig()
    private val extractor =
        TextExtractor(
            PdfTextLayer(ApplicationProvider.getApplicationContext(), config),
            PdfPageRenderer(config),
            PhotoLoader(config),
            MlKitOcr(),
            config,
        )

    @Test
    fun textPdfScannedPdfAndPhotoGiveTheSamePage() =
        runTest {
            val textPdf = PdfFixtures.textPdf(folder.newFile("text.pdf"), PdfFixtures.PAYSLIP)
            val image = PdfPageRenderer(config).open(textPdf).use { it.render(0) }
            val scannedPdf = imageOnlyPdf(image, folder.newFile("scanned.pdf"))
            val photo =
                folder.newFile("photo.jpg").also { file ->
                    file.outputStream().use { image.compress(Bitmap.CompressFormat.JPEG, 90, it) }
                }
            image.recycle()

            val fromText = extractor.fromPdf(textPdf).single()
            val fromScan = extractor.fromPdf(scannedPdf).single()
            val fromPhoto = extractor.fromImages(listOf(photo)).single()

            assertEquals(TextSource.PDF_TEXT_LAYER, fromText.source)
            assertEquals(TextSource.OCR, fromScan.source)
            assertEquals(TextSource.OCR, fromPhoto.source)
            assertSamePage(fromText, fromScan)
            assertSamePage(fromText, fromPhoto)
        }

    private fun assertSamePage(
        expected: TextPage,
        actual: TextPage,
    ) {
        assertEquals(expected.number, actual.number)
        assertEquals(expected.blocks.map { it.text }, actual.blocks.map { it.text })
        expected.blocks.zip(actual.blocks).forEach { (a, b) ->
            val message = "${a.text}: ${a.box} vs ${b.box}"
            assertTrue(message, abs(a.box.left - b.box.left) < BOX_TOLERANCE)
            assertTrue(message, abs(a.box.right - b.box.right) < BOX_TOLERANCE)
            assertTrue(message, abs(a.box.centerY - b.box.centerY) < BOX_TOLERANCE)
        }
    }

    /** The page image embedded full-page in a PDF without text, as a scanner app produces. */
    private fun imageOnlyPdf(
        image: Bitmap,
        file: File,
    ): File {
        PDDocument().use { document ->
            val page = PDPage(PDRectangle.A4)
            document.addPage(page)
            val picture = JPEGFactory.createFromImage(document, image, 0.9f)
            PDPageContentStream(document, page).use {
                it.drawImage(picture, 0f, 0f, PDRectangle.A4.width, PDRectangle.A4.height)
            }
            document.save(file)
        }
        return file
    }

    private companion object {
        /** 2 % of the page: about 12 pt across and 17 pt down an A4 page. */
        const val BOX_TOLERANCE = 0.02f
    }
}
