package com.dbmsystem.papeles.core.text

/** Numbers of the text step. All are hypotheses, to be tuned with the synthetic set (M9). */
data class TextExtractionConfig(
    /** A PDF page whose text layer has fewer letters and digits than this is treated as scanned and read by OCR. */
    val minTextLayerCharacters: Int = 25,
    /** Resolution used to render scanned PDF pages for OCR. */
    val renderDpi: Int = 250,
    /** Longest side, in pixels, of any image handed to OCR (keeps memory bounded on large photos). */
    val maxImageSide: Int = 3000,
    /** In a PDF line, a gap wider than this many line heights starts a new block, as OCR does with columns. */
    val columnGapInLineHeights: Float = 1.5f,
)
