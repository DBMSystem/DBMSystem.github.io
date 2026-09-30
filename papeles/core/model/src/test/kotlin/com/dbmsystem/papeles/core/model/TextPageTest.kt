package com.dbmsystem.papeles.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class TextPageTest {
    private fun block(
        text: String,
        left: Float,
        top: Float,
        height: Float = 0.02f,
    ) = TextBlock(text, BoundingBox(left, top, left + 0.2f, top + height), 1f)

    @Test
    fun `reading order goes by rows, then left to right`() {
        val blocks =
            listOf(
                block("Líquido a percibir", 0.1f, 0.50f),
                block("1.650,00", 0.7f, 0.497f),
                block("Nómina", 0.1f, 0.10f),
                block("Septiembre", 0.5f, 0.104f),
            )
        assertEquals(
            listOf("Nómina", "Septiembre", "Líquido a percibir", "1.650,00"),
            blocks.inReadingOrder().map { it.text },
        )
    }

    @Test
    fun `page text joins its lines`() {
        val page = TextPage(1, TextSource.OCR, listOf(block("Nómina", 0.1f, 0.1f), block("Octubre", 0.1f, 0.2f)))
        assertEquals("Nómina\nOctubre", page.text)
    }
}
