package com.dbmsystem.papeles.tools.synthetic

import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.TextSource

/**
 * Lays text out top to bottom as the text step would return it: one block per line, and label and value of a row as
 * two blocks on the same line (as OCR splits columns). Sizes are rough, enough for positions to be meaningful.
 */
internal class PageBuilder {
    private val pages = mutableListOf<List<TextBlock>>()
    private var blocks = mutableListOf<TextBlock>()
    private var y = TOP

    fun title(text: String) = line(text, size = TITLE_SIZE)

    fun line(
        text: String,
        x: Float = LEFT,
        size: Float = 1f,
    ) {
        block(text, x, size)
        advance(size)
    }

    /** Label on the left, value aligned to the right. */
    fun row(
        label: String,
        value: String,
    ) {
        block(label, LEFT, 1f)
        block(value, RIGHT - width(value, 1f), 1f)
        advance(1f)
    }

    /** Cells at the given horizontal positions (0..1), as in a table. */
    fun cells(vararg cells: Pair<Float, String>) {
        cells.forEach { (x, text) -> block(text, x, 1f) }
        advance(1f)
    }

    fun gap() {
        y += LINE_HEIGHT / 2
    }

    fun build(): List<TextPage> {
        if (blocks.isNotEmpty()) pages += blocks
        return pages.mapIndexed { index, page -> TextPage(index + 1, TextSource.OCR, page) }
    }

    private fun block(
        text: String,
        x: Float,
        size: Float,
    ) {
        val right = (x + width(text, size)).coerceAtMost(1f)
        blocks += TextBlock(text, BoundingBox(x, y, right, y + CHAR_HEIGHT * size), 1f)
    }

    private fun advance(size: Float) {
        y += LINE_HEIGHT * size
        if (y > BOTTOM) {
            pages += blocks
            blocks = mutableListOf()
            y = TOP
        }
    }

    private fun width(
        text: String,
        size: Float,
    ): Float = (text.length * CHAR_WIDTH * size).coerceAtMost(RIGHT - LEFT)

    private companion object {
        const val TOP = 0.05f
        const val BOTTOM = 0.93f
        const val LEFT = 0.08f
        const val RIGHT = 0.92f
        const val CHAR_WIDTH = 0.0095f
        const val CHAR_HEIGHT = 0.013f
        const val LINE_HEIGHT = 0.026f
        const val TITLE_SIZE = 1.4f
    }
}

internal fun page(build: PageBuilder.() -> Unit): List<TextPage> = PageBuilder().apply(build).build()
