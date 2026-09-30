package com.dbmsystem.papeles.core.text

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import java.io.Closeable
import java.io.File
import javax.inject.Inject
import kotlin.math.roundToInt

/** Renders PDF pages to images for OCR. */
interface PageRenderer {
    fun open(file: File): RenderedPdf
}

interface RenderedPdf : Closeable {
    /** A white-background image of the page at [pageIndex] (0-based). The caller recycles it. */
    fun render(pageIndex: Int): Bitmap
}

class PdfPageRenderer
    @Inject
    constructor(
        private val config: TextExtractionConfig,
    ) : PageRenderer {
        override fun open(file: File): RenderedPdf {
            val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer =
                try {
                    PdfRenderer(descriptor)
                } catch (e: Exception) {
                    descriptor.close()
                    throw e
                }
            return object : RenderedPdf {
                override fun render(pageIndex: Int): Bitmap =
                    renderer.openPage(pageIndex).use { page ->
                        val scale = scaleFor(page.width, page.height)
                        val bitmap =
                            Bitmap.createBitmap(
                                (page.width * scale).roundToInt().coerceAtLeast(1),
                                (page.height * scale).roundToInt().coerceAtLeast(1),
                                Bitmap.Config.ARGB_8888,
                            )
                        // PdfRenderer leaves the background transparent, which OCR would read as black.
                        bitmap.eraseColor(Color.WHITE)
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        bitmap
                    }

                override fun close() {
                    renderer.close()
                    descriptor.close()
                }
            }
        }

        /** Page sizes are in points (1/72 inch). */
        private fun scaleFor(
            width: Int,
            height: Int,
        ): Float {
            val byDpi = config.renderDpi / POINTS_PER_INCH
            val bySide = config.maxImageSide / maxOf(width, height).toFloat()
            return minOf(byDpi, bySide)
        }

        private companion object {
            const val POINTS_PER_INCH = 72f
        }
    }
