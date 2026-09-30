package com.dbmsystem.papeles.core.text

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.IOException
import javax.inject.Inject

/** Decodes a photo upright (EXIF rotation applied) and no larger than [TextExtractionConfig.maxImageSide]. */
open class PhotoLoader
    @Inject
    constructor(
        private val config: TextExtractionConfig,
    ) {
        open fun load(file: File): Bitmap {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.path, bounds)
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IOException("Not an image.")
            var sample = 1
            while (maxOf(bounds.outWidth, bounds.outHeight) / sample > config.maxImageSide) sample *= 2
            val bitmap =
                BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = sample })
                    ?: throw IOException("Not an image.")
            val rotation = ExifInterface(file).rotationDegrees
            if (rotation == 0) return bitmap
            val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
            return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true).also {
                if (it !== bitmap) bitmap.recycle()
            }
        }
    }
