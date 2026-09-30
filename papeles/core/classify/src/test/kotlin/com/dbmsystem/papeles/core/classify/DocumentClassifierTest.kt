package com.dbmsystem.papeles.core.classify

import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.TextSource
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Hand-written synthetic cases, including the types the 15-format set does not cover, and negative cases. */
class DocumentClassifierTest {
    private val classifier = DocumentClassifier()

    private fun pages(vararg lines: String) =
        listOf(
            TextPage(
                1,
                TextSource.OCR,
                lines.mapIndexed { index, text ->
                    TextBlock(text, BoundingBox(0.1f, 0.05f + index * 0.03f, 0.9f, 0.065f + index * 0.03f), 0.9f)
                },
            ),
        )

    private fun classify(vararg lines: String) = classifier.classify(pages(*lines))

    @Test
    fun `a purchase receipt`() {
        val result =
            classify(
                "Electrodomésticos Faro",
                "Factura simplificada T-2026/004512",
                "1 ud Cafetera exprés 89,90",
                "Nº de serie: CF-88213-X",
                "Garantía: 3 años",
                "Plazo de devolución: 30 días",
                "Total (IVA incluido) 89,90",
            )
        assertEquals(DocumentType.PURCHASE, result.type)
        assertFalse(classifier.needsUserChoice(result))
    }

    @Test
    fun `an ITV report`() {
        val result =
            classify(
                "Estación ITV Los Pinos",
                "Informe de inspección técnica de vehículos",
                "Matrícula 1234 KLM",
                "Nº de bastidor VF1RFB00000000000",
                "Kilometraje 84.300 km",
                "Resultado: favorable. Próxima inspección antes del 12/03/2028",
            )
        assertEquals(DocumentType.VEHICLE, result.type)
    }

    @Test
    fun `a lease contract`() {
        val result =
            classify(
                "CONTRATO DE ARRENDAMIENTO DE VIVIENDA",
                "REUNIDOS",
                "De una parte, el arrendador, y de otra, la arrendataria.",
                "Ambas partes EXPONEN",
                "CLÁUSULAS",
                "Primera. Duración: un año prorrogable.",
                "Cualquiera de las partes podrá resolverlo con un preaviso de 30 días.",
                "Y en prueba de conformidad, firman el presente contrato.",
            )
        assertEquals(DocumentType.CONTRACT_DATES, result.type)
    }

    @Test
    fun `text without evidence is OTHER and still says why`() {
        val result = classify("Receta de la abuela", "Tomates, aceite y sal.", "Hornear 20 minutos.")
        assertEquals(DocumentType.OTHER, result.type)
        assertEquals("classify.other.no_evidence", result.reasons.first().ruleId)
    }

    @Test
    fun `no text at all is OTHER with reasons too`() {
        val result = classifier.classify(emptyList())
        assertEquals(DocumentType.OTHER, result.type)
        assertTrue(result.reasons.isNotEmpty())
        assertEquals(3, result.options.size)
    }

    @Test
    fun `an ambiguous document asks the user with the likeliest types first`() {
        val result =
            classify(
                "Seguro de automóvil",
                "Póliza 44-1200987",
                "Matrícula 1234 KLM",
                "Vehículo: turismo",
            )
        assertTrue(classifier.needsUserChoice(result))
        assertEquals(setOf(DocumentType.INSURANCE, DocumentType.VEHICLE), result.options.take(2).toSet())
        assertFalse(DocumentType.OTHER in result.options)
    }

    @Test
    fun `reasons point to the line and page where the rule matched`() {
        val result = classify("Empresa Ejemplo", "Total devengado 2.000,00", "Líquido a percibir 1.650,00", "IRPF 12 %")
        assertEquals(DocumentType.PAYSLIP, result.type)
        val earnings = result.reasons.single { it.ruleId == "classify.payslip.earnings" }
        assertEquals(1, earnings.page)
        assertEquals("Total devengado 2.000,00", earnings.text)
        assertTrue(result.reasons.all { it.ruleId.startsWith("classify.payslip.") })
    }

    @Test
    fun `OCR digits inside words do not hide a signal`() {
        val result = classify("N0MINA", "T0TAL DEVENGAD0 2.000,00", "LIQUID0 A PERCIBIR 1.650,00")
        assertEquals(DocumentType.PAYSLIP, result.type)
    }
}
