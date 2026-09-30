package com.dbmsystem.papeles.core.model

/** How a page's text was obtained. */
enum class TextSource {
    /** Read from the PDF's own text layer. */
    PDF_TEXT_LAYER,

    /** Recognised from an image (photo, scan or a PDF page without text). */
    OCR,
}

/** One line of text and where it sits on the page. */
data class TextBlock(
    val text: String,
    val box: BoundingBox,
    /** 0..1; text from a PDF text layer is exact (1). */
    val confidence: Float,
) {
    init {
        require(confidence in 0f..1f) { "Confidence must be within 0..1." }
    }
}

/**
 * The text of one page, whatever the input was (PDF with text, scanned PDF or photo): every later step of the
 * pipeline (classification, extraction) reads only this model.
 */
data class TextPage(
    /** 1-based. */
    val number: Int,
    val source: TextSource,
    /** In reading order: top to bottom, then left to right. */
    val blocks: List<TextBlock>,
) {
    init {
        require(number >= 1) { "Pages are numbered from 1." }
    }

    val text: String get() = blocks.joinToString("\n") { it.text }
}

/**
 * Top to bottom, then left to right. Blocks whose vertical centres are closer than half the shorter block's height
 * count as the same row, so small vertical jitter between OCR and PDF boxes does not change the order.
 */
fun List<TextBlock>.inReadingOrder(): List<TextBlock> {
    val rows = mutableListOf<MutableList<TextBlock>>()
    for (block in sortedBy { it.box.centerY }) {
        val row = rows.lastOrNull()
        val sameRow =
            row != null &&
                row.any {
                    kotlin.math.abs(it.box.centerY - block.box.centerY) < minOf(it.box.height, block.box.height) / 2
                }
        if (sameRow) row.add(block) else rows.add(mutableListOf(block))
    }
    return rows.flatMap { row -> row.sortedBy { it.box.left } }
}
