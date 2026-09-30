package com.dbmsystem.papeles.core.text

import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.TextSource
import java.io.File
import javax.inject.Inject

/**
 * Pipeline step 2: a PDF page's own text layer when it has one, OCR of the rendered page when it does not, and OCR
 * for photos. Whatever the input, the result is the same [TextPage] model.
 */
class TextExtractor
    @Inject
    constructor(
        private val textLayer: PdfTextLayer,
        private val renderer: PageRenderer,
        private val photos: PhotoLoader,
        private val ocr: Ocr,
        private val config: TextExtractionConfig,
    ) {
        suspend fun fromPdf(file: File): List<TextPage> {
            val layers = textLayer.read(file)
            // Rendering is only needed for scanned pages, so the renderer opens on the first one.
            var rendered: RenderedPdf? = null
            try {
                return layers.mapIndexed { index, blocks ->
                    if (hasTextLayer(blocks)) {
                        TextPage(index + 1, TextSource.PDF_TEXT_LAYER, blocks)
                    } else {
                        val pdf = rendered ?: renderer.open(file).also { rendered = it }
                        val image = pdf.render(index)
                        try {
                            TextPage(index + 1, TextSource.OCR, ocr.read(image))
                        } finally {
                            image.recycle()
                        }
                    }
                }
            } finally {
                rendered?.close()
            }
        }

        suspend fun fromImages(files: List<File>): List<TextPage> =
            files.mapIndexed { index, file ->
                val image = photos.load(file)
                try {
                    TextPage(index + 1, TextSource.OCR, ocr.read(image))
                } finally {
                    image.recycle()
                }
            }

        private fun hasTextLayer(blocks: List<TextBlock>): Boolean =
            blocks.sumOf { block -> block.text.count { it.isLetterOrDigit() } } >= config.minTextLayerCharacters
    }
