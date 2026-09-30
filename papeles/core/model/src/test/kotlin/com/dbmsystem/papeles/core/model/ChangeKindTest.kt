package com.dbmsystem.papeles.core.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChangeKindTest {
    @Test
    fun `up and down need both values`() {
        assertTrue(ChangeKind.UP.isConsistent("1.000,00", "1.050,00"))
        assertFalse(ChangeKind.DOWN.isConsistent(null, "1.050,00"))
    }

    @Test
    fun `added has no before and removed has no after`() {
        assertTrue(ChangeKind.ADDED.isConsistent(null, "50,00"))
        assertFalse(ChangeKind.ADDED.isConsistent("0,00", "50,00"))
        assertTrue(ChangeKind.REMOVED.isConsistent("50,00", null))
        assertFalse(ChangeKind.REMOVED.isConsistent(null, null))
    }
}
