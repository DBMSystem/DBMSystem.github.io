package com.dbmsystem.papeles.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class OriginTest {
    @Test
    fun `origins go from weakest to strongest`() {
        assertEquals(
            listOf(Origin.ESTIMATED, Origin.DETECTED, Origin.USER_CONFIRMED, Origin.VERIFIED_EXTERNAL),
            Origin.entries.sorted(),
        )
    }

    @Test
    fun `a derived datum takes the weakest origin`() {
        assertEquals(Origin.DETECTED, weakest(Origin.USER_CONFIRMED, Origin.DETECTED, Origin.VERIFIED_EXTERNAL))
        assertEquals(Origin.ESTIMATED, weakest(Origin.VERIFIED_EXTERNAL, Origin.ESTIMATED))
        assertEquals(Origin.USER_CONFIRMED, weakest(Origin.USER_CONFIRMED, Origin.USER_CONFIRMED))
    }

    @Test
    fun `a single source keeps its origin`() {
        Origin.entries.forEach { assertEquals(it, weakest(it)) }
    }

    @Test(expected = IllegalArgumentException::class)
    fun `a derived datum without sources is rejected`() {
        weakest()
    }
}
