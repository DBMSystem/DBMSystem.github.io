package com.dbmsystem.papeles.core.text

import androidx.test.core.app.ApplicationProvider
import com.dbmsystem.papeles.core.text.PdfFixtures.Line
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PdfTextLayerTest {
    @get:Rule
    val folder = TemporaryFolder()

    private val layer = PdfTextLayer(ApplicationProvider.getApplicationContext(), TextExtractionConfig())

    @Test
    fun `reads each line with its accents and a normalised box`() {
        val pdf = PdfFixtures.textPdf(folder.newFile("payslip.pdf"), PdfFixtures.PAYSLIP)

        val blocks = layer.read(pdf).single()

        assertEquals(PdfFixtures.PAYSLIP.map { it.text }, blocks.map { it.text })
        val title = blocks.first().box
        // Drawn 72 pt from the left and with its baseline 100 pt from the top of an A4 page (595 x 842 pt).
        assertEquals(72f / 595f, title.left, 0.005f)
        assertEquals(100f / 842f, title.bottom, 0.005f)
        assertTrue(title.top < title.bottom && title.right > title.left)
        assertTrue(blocks.all { it.confidence == 1f })
    }

    @Test
    fun `a wide gap in a line starts a new block, like a table column`() {
        val row = listOf(Line("Salario base", 72f, 100f, 12f), Line("1.800,00", 400f, 100f, 12f))
        val pdf = PdfFixtures.textPdf(folder.newFile("row.pdf"), row)

        assertEquals(listOf("Salario base", "1.800,00"), layer.read(pdf).single().map { it.text })
    }

    @Test
    fun `pages without a text layer come back empty`() {
        val pdf = PdfFixtures.textPdf(folder.newFile("mixed.pdf"), PdfFixtures.PAYSLIP, emptyList())

        val pages = layer.read(pdf)

        assertEquals(2, pages.size)
        assertTrue(pages[1].isEmpty())
    }

    @Test
    fun `a password-protected PDF is reported as such`() {
        val pdf = PdfFixtures.textPdf(folder.newFile("locked.pdf"), PdfFixtures.PAYSLIP, userPassword = "12345678Z")

        assertThrows(InvalidPasswordException::class.java) { layer.read(pdf) }
    }
}
