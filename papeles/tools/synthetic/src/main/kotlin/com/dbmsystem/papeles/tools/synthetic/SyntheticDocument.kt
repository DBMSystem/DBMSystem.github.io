package com.dbmsystem.papeles.tools.synthetic

import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.TextPage
import kotlin.random.Random

/**
 * The 15 formats of the synthetic set (docs/SIMULACIONES_Y_PUBLICACION.md, gate 0): 5 payslips, 3 electricity,
 * 2 gas, 1 water, 2 phone and internet, 1 insurance and 1 subscription. All issuers are invented.
 */
enum class SyntheticFormat(
    val type: DocumentType,
    internal val template: (Values) -> Draft,
) {
    PAYSLIP_CLASSIC(DocumentType.PAYSLIP, ::classicPayslip),
    PAYSLIP_MODERN(DocumentType.PAYSLIP, ::modernPayslip),
    PAYSLIP_OVERTIME(DocumentType.PAYSLIP, ::overtimePayslip),
    PAYSLIP_CODES(DocumentType.PAYSLIP, ::codedPayslip),
    PAYSLIP_PART_TIME(DocumentType.PAYSLIP, ::partTimePayslip),
    ELECTRICITY_DETAILED(DocumentType.UTILITY_BILL, ::detailedElectricityBill),
    ELECTRICITY_SUMMARY(DocumentType.UTILITY_BILL, ::summaryElectricityBill),
    ELECTRICITY_TABLE(DocumentType.UTILITY_BILL, ::tableElectricityBill),
    GAS_DETAILED(DocumentType.UTILITY_BILL, ::detailedGasBill),
    GAS_SUMMARY(DocumentType.UTILITY_BILL, ::summaryGasBill),
    WATER(DocumentType.UTILITY_BILL, ::waterBill),
    TELECOM_BUNDLE(DocumentType.UTILITY_BILL, ::bundleTelecomBill),
    TELECOM_SUMMARY(DocumentType.UTILITY_BILL, ::summaryTelecomBill),
    INSURANCE_RENEWAL(DocumentType.INSURANCE, ::insuranceRenewal),
    SUBSCRIPTION_RECEIPT(DocumentType.SUBSCRIPTION, ::subscriptionReceipt),
}

/** Text-level damage like the one OCR leaves; photo noise (blur, shadow, rotation) is added when rendering (M9). */
enum class TextNoise {
    CLEAN,
    NO_ACCENTS,
    OCR_LIGHT,
    OCR_HEAVY,
}

/**
 * One synthetic document: its pages as [TextPage]s (what the text step would return) and the known values of its
 * fields. Truth values are normalised: amounts as "1234.56", percentages as "15.00", dates as ISO "2026-09-30",
 * periods as "2026-09".
 */
data class SyntheticDocument(
    val id: String,
    val format: SyntheticFormat,
    val noise: TextNoise,
    val pages: List<TextPage>,
    val truth: Map<String, String>,
) {
    val type: DocumentType get() = format.type
}

internal class Draft(
    val pages: List<TextPage>,
    val truth: Map<String, String>,
)

object SyntheticCorpus {
    /** 300 documents by default: 20 per format, the four noise levels in turn. Same seed, same corpus. */
    fun generate(
        seed: Long = 20260930L,
        perFormat: Int = 20,
    ): List<SyntheticDocument> {
        val random = Random(seed)
        return SyntheticFormat.entries.flatMap { format ->
            (0 until perFormat).map { index ->
                val noise = TextNoise.entries[index % TextNoise.entries.size]
                val draft = format.template(Values(random))
                SyntheticDocument(
                    id = "${format.name.lowercase()}-${index + 1}",
                    format = format,
                    noise = noise,
                    pages = draft.pages.map { page -> applyNoise(page, noise, random) },
                    truth = draft.truth,
                )
            }
        }
    }
}
