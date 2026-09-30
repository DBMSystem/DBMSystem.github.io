package com.dbmsystem.papeles.core.text

import android.graphics.Bitmap
import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.inReadingOrder
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/** Recognises the lines of text in an upright image. */
interface Ocr {
    suspend fun read(image: Bitmap): List<TextBlock>
}

/** ML Kit Text Recognition v2, Latin model bundled in the app: runs on the device, without network. */
@Singleton
class MlKitOcr
    @Inject
    constructor() : Ocr {
        private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

        override suspend fun read(image: Bitmap): List<TextBlock> {
            val width = image.width.toFloat()
            val height = image.height.toFloat()
            val result = recognizer.process(InputImage.fromBitmap(image, 0)).await()
            return result.textBlocks
                .flatMap { it.lines }
                .mapNotNull { line ->
                    val rect = line.boundingBox ?: return@mapNotNull null
                    val text = line.text.trim()
                    if (text.isEmpty()) return@mapNotNull null
                    val box =
                        BoundingBox.normalize(
                            rect.left.toFloat(),
                            rect.top.toFloat(),
                            rect.right.toFloat(),
                            rect.bottom.toFloat(),
                            width,
                            height,
                        )
                    TextBlock(text, box, line.confidence.coerceIn(0f, 1f))
                }.inReadingOrder()
        }
    }
