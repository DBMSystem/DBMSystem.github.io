package com.dbmsystem.papeles.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class BoundingBoxTest {
    @Test
    fun `encodes and decodes as l,t,r,b`() {
        val box = BoundingBox(0.1f, 0.2f, 0.5f, 0.25f)
        assertEquals("0.1,0.2,0.5,0.25", box.encode())
        assertEquals(box, BoundingBox.decode(box.encode()))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rejects coordinates outside the page`() {
        BoundingBox(0f, 0f, 1.2f, 0.5f)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rejects an inverted box`() {
        BoundingBox(0.6f, 0f, 0.5f, 0.5f)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rejects a malformed stored box`() {
        BoundingBox.decode("0.1,0.2,0.3")
    }
}
