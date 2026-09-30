package com.dbmsystem.papeles.core.text

import android.content.Context
import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.inReadingOrder
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.text.PDFTextStripper
import com.tom_roush.pdfbox.text.TextPosition
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.StringWriter
import javax.inject.Inject

/** Reads the text layer of a PDF, if it has one, as blocks per page with normalised boxes. */
class PdfTextLayer
    @Inject
    constructor(
        @ApplicationContext context: Context,
        private val config: TextExtractionConfig,
    ) {
        init {
            PDFBoxResourceLoader.init(context)
        }

        /**
         * One list of blocks per page, in reading order; empty for pages without text.
         * Throws [com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException] for password-protected files.
         */
        fun read(file: File): List<List<TextBlock>> = PDDocument.load(file).use { BlockCollector(config).collect(it) }
    }

/** Groups PDFBox's words into lines, splitting a line where a column gap separates its words. */
private class BlockCollector(
    private val config: TextExtractionConfig,
) : PDFTextStripper() {
    private val pages = mutableListOf<List<TextBlock>>()
    private var blocks = mutableListOf<TextBlock>()
    private val words = mutableListOf<Pair<String, List<TextPosition>>>()
    private var pageWidth = 1f
    private var pageHeight = 1f

    init {
        sortByPosition = true
    }

    fun collect(document: PDDocument): List<List<TextBlock>> {
        writeText(document, StringWriter())
        return pages
    }

    override fun startPage(page: PDPage) {
        super.startPage(page)
        val box = page.cropBox
        val quarterTurn = page.rotation % 180 != 0
        pageWidth = if (quarterTurn) box.height else box.width
        pageHeight = if (quarterTurn) box.width else box.height
        blocks = mutableListOf()
    }

    override fun writeString(
        text: String,
        textPositions: List<TextPosition>,
    ) {
        val previous = words.lastOrNull()?.second?.lastOrNull()
        val first = textPositions.firstOrNull()
        if (previous != null && first != null) {
            val gap = first.xDirAdj - (previous.xDirAdj + previous.widthDirAdj)
            if (gap > config.columnGapInLineHeights * maxOf(previous.heightDir, first.heightDir)) flushBlock()
        }
        words += text to textPositions.toList()
    }

    override fun writeLineSeparator() = flushBlock()

    override fun endPage(page: PDPage) {
        flushBlock()
        pages += blocks.inReadingOrder()
        super.endPage(page)
    }

    private fun flushBlock() {
        val text = words.joinToString(" ") { it.first }.trim().replace(WHITESPACE, " ")
        val positions = words.flatMap { it.second }
        words.clear()
        if (text.isEmpty() || positions.isEmpty()) return
        val box =
            BoundingBox.normalize(
                left = positions.minOf { it.xDirAdj },
                top = positions.minOf { it.yDirAdj - it.heightDir },
                right = positions.maxOf { it.xDirAdj + it.widthDirAdj },
                bottom = positions.maxOf { it.yDirAdj },
                width = pageWidth,
                height = pageHeight,
            )
        blocks += TextBlock(text, box, confidence = 1f)
    }

    private companion object {
        val WHITESPACE = Regex("\\s+")
    }
}
