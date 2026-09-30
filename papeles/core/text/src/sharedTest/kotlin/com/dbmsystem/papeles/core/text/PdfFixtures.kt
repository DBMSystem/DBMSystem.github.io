package com.dbmsystem.papeles.core.text

import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.encryption.AccessPermission
import com.tom_roush.pdfbox.pdmodel.encryption.StandardProtectionPolicy
import com.tom_roush.pdfbox.pdmodel.font.PDType1Font
import java.io.File

/** Synthetic documents built in the test itself: no real document ever enters the repository. */
object PdfFixtures {
    /** A line of text drawn at [x], [y] points from the page's top-left corner. */
    data class Line(
        val text: String,
        val x: Float,
        val y: Float,
        val size: Float = 18f,
    )

    /** A simple payslip-like page: one column, lines well apart, Spanish accents included. */
    val PAYSLIP =
        listOf(
            Line("NÓMINA DE SEPTIEMBRE 2026", 72f, 100f, 22f),
            Line("Cocinas del Sur, S.L.", 72f, 160f),
            Line("Período: 01/09/2026 a 30/09/2026", 72f, 220f),
            Line("Total devengado 2.150,00", 72f, 280f),
            Line("Líquido a percibir 1.735,42", 72f, 340f),
        )

    /** A PDF with a text layer; an empty list of lines gives a page without text (like a blank scan). */
    fun textPdf(
        file: File,
        vararg pages: List<Line>,
        userPassword: String? = null,
    ): File {
        PDDocument().use { document ->
            for (lines in pages) {
                val page = PDPage(PDRectangle.A4)
                document.addPage(page)
                PDPageContentStream(document, page).use { stream ->
                    for (line in lines) {
                        stream.beginText()
                        stream.setFont(PDType1Font.HELVETICA, line.size)
                        stream.newLineAtOffset(line.x, PDRectangle.A4.height - line.y)
                        stream.showText(line.text)
                        stream.endText()
                    }
                }
            }
            if (userPassword != null) {
                document.protect(StandardProtectionPolicy("owner-$userPassword", userPassword, AccessPermission()))
            }
            document.save(file)
        }
        return file
    }
}
