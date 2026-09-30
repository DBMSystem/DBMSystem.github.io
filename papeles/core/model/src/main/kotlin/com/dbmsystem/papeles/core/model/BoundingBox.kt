package com.dbmsystem.papeles.core.model

/** Zone of a page a datum was read from, normalised to 0..1 of the page width and height. */
data class BoundingBox(
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float,
) {
    init {
        require(listOf(left, top, right, bottom).all { it in 0f..1f }) { "Coordinates must be normalised to 0..1." }
        require(left <= right && top <= bottom) { "The box must not be inverted." }
    }

    val height: Float get() = bottom - top

    val centerY: Float get() = (top + bottom) / 2

    /** Stored form: "l,t,r,b". */
    fun encode(): String = "$left,$top,$right,$bottom"

    companion object {
        /**
         * Normalises a box given in the units of a page of [width] x [height] (pixels or PDF points). Recognisers
         * may return boxes slightly outside the page, so coordinates are clamped to it.
         */
        fun normalize(
            left: Float,
            top: Float,
            right: Float,
            bottom: Float,
            width: Float,
            height: Float,
        ): BoundingBox {
            require(width > 0 && height > 0) { "The page must have a size." }

            fun clamp(value: Float) = value.coerceIn(0f, 1f)
            return BoundingBox(
                clamp(minOf(left, right) / width),
                clamp(minOf(top, bottom) / height),
                clamp(maxOf(left, right) / width),
                clamp(maxOf(top, bottom) / height),
            )
        }

        fun decode(text: String): BoundingBox {
            val values = text.split(",").map { it.trim().toFloat() }
            require(values.size == 4) { "A box has four coordinates." }
            return BoundingBox(values[0], values[1], values[2], values[3])
        }
    }
}
