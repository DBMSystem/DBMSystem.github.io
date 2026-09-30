package com.dbmsystem.papeles.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class TextNormalizationTest {
    @Test
    fun `folds case, accents, ñ and spacing`() {
        assertEquals("liquido a percibir", "  LÍQUIDO   a Percibir ".folded())
        assertEquals("compania espanola", "Compañía Española".folded())
    }
}
