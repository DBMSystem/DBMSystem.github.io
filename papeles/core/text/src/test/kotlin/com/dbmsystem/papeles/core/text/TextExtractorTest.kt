package com.dbmsystem.papeles.core.text

import android.graphics.Bitmap
import androidx.test.core.app.ApplicationProvider
import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.TextSource
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

@RunWith(RobolectricTestRunner::class)
class TextExtractorTest {
    @get:Rule
    val folder = TemporaryFolder()

    private val config = TextExtractionConfig()
    private val ocrBlock = TextBlock("Texto reconocido", BoundingBox(0.1f, 0.1f, 0.5f, 0.12f), 0.9f)
    private val renderedPages = mutableListOf<Int>()
    private var ocrCalls = 0

    private val renderer =
        object : PageRenderer {
            override fun open(file: File) =
                object : RenderedPdf {
                    override fun render(pageIndex: Int): Bitmap {
                        renderedPages += pageIndex
                        return Bitmap.createBitmap(10, 10, Bitmap.Config.ARGB_8888)
                    }

                    override fun close() = Unit
                }
        }

    private val ocr =
        object : Ocr {
            override suspend fun read(image: Bitmap): List<TextBlock> {
                ocrCalls++
                return listOf(ocrBlock)
            }
        }

    private val photos =
        object : PhotoLoader(config) {
            override fun load(file: File): Bitmap = Bitmap.createBitmap(10, 10, Bitmap.Config.ARGB_8888)
        }

    private val extractor =
        TextExtractor(PdfTextLayer(ApplicationProvider.getApplicationContext(), config), renderer, photos, ocr, config)

    @Test
    fun `a PDF with text is read from its text layer, without OCR`() =
        runTest {
            val pages = extractor.fromPdf(PdfFixtures.textPdf(folder.newFile("text.pdf"), PdfFixtures.PAYSLIP))

            assertEquals(TextSource.PDF_TEXT_LAYER, pages.single().source)
            assertEquals(0, ocrCalls)
            assertEquals(emptyList<Int>(), renderedPages)
        }

    @Test
    fun `only the pages without text are rendered and read by OCR`() =
        runTest {
            val pdf =
                PdfFixtures.textPdf(
                    folder.newFile("mixed.pdf"),
                    PdfFixtures.PAYSLIP,
                    emptyList(),
                    PdfFixtures.PAYSLIP,
                )

            val pages = extractor.fromPdf(pdf)

            assertEquals(listOf(1, 2, 3), pages.map { it.number })
            assertEquals(
                listOf(TextSource.PDF_TEXT_LAYER, TextSource.OCR, TextSource.PDF_TEXT_LAYER),
                pages.map { it.source },
            )
            assertEquals(listOf(1), renderedPages)
            assertEquals(listOf(ocrBlock), pages[1].blocks)
        }

    @Test
    fun `a page with only a few characters of text counts as scanned`() =
        runTest {
            val pdf = PdfFixtures.textPdf(folder.newFile("stamp.pdf"), listOf(PdfFixtures.Line("Pág. 1", 72f, 800f)))

            assertEquals(TextSource.OCR, extractor.fromPdf(pdf).single().source)
        }

    @Test
    fun `each photo is one page read by OCR`() =
        runTest {
            val pages = extractor.fromImages(listOf(folder.newFile("1.jpg"), folder.newFile("2.jpg")))

            assertEquals(listOf(1, 2), pages.map { it.number })
            assertEquals(setOf(TextSource.OCR), pages.map { it.source }.toSet())
            assertEquals(2, ocrCalls)
        }
}
