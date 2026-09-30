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

    /** Stored form: "l,t,r,b". */
    fun encode(): String = "$left,$top,$right,$bottom"

    companion object {
        fun decode(text: String): BoundingBox {
            val values = text.split(",").map { it.trim().toFloat() }
            require(values.size == 4) { "A box has four coordinates." }
            return BoundingBox(values[0], values[1], values[2], values[3])
        }
    }
}
