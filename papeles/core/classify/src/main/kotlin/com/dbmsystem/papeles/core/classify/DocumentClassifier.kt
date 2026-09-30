package com.dbmsystem.papeles.core.classify

import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.folded
import javax.inject.Inject

/** Why a type was chosen: the rule that matched and where, so it can be shown and checked. */
data class Reason(
    val ruleId: String,
    val weight: Float,
    val page: Int?,
    val box: BoundingBox?,
    /** The line where the rule matched. */
    val text: String?,
)

data class Classification(
    val type: DocumentType,
    val confidence: Float,
    val reasons: List<Reason>,
    /** The three likeliest types (never OTHER), for the question "¿Qué es este documento?". */
    val options: List<DocumentType>,
    val scores: Map<DocumentType, Float>,
) {
    init {
        require(reasons.isNotEmpty()) { "Every classification states its reasons." }
        require(confidence in 0f..1f) { "Confidence must be within 0..1." }
    }
}

/** Pipeline step 3: rule-based document type, with confidence and reasons (M3). */
class DocumentClassifier(
    private val config: ClassifierConfig,
    private val signals: List<Signal> = SIGNALS,
) {
    @Inject
    constructor() : this(ClassifierConfig())

    fun needsUserChoice(classification: Classification): Boolean = classification.confidence < config.askBelow

    fun classify(pages: List<TextPage>): Classification {
        val hits = findSignals(pages)
        val scores =
            DocumentType.entries
                .filter { it != DocumentType.OTHER }
                .associateWith { 0f }
                .toMutableMap()
        hits.forEach { (signal, _) -> scores[signal.type] = scores.getValue(signal.type) + signal.weight }
        val ranked =
            scores.entries.sortedWith(
                compareByDescending<Map.Entry<DocumentType, Float>> {
                    it.value
                }.thenBy { it.key.ordinal },
            )
        val best = ranked[0]
        val second = ranked[1].value
        val options = ranked.take(OPTIONS).map { it.key }

        if (best.value < config.minScore) {
            val confidence = config.otherConfidence * (1 - best.value / config.minScore)
            val reasons = listOf(Reason(NO_EVIDENCE_RULE, 0f, null, null, null)) + hits.map { it.second }
            return Classification(DocumentType.OTHER, confidence, reasons, options, scores)
        }
        val margin = (best.value - second) / best.value
        val evidence = (best.value / config.strongScore).coerceAtMost(1f)
        val reasons = hits.filter { it.first.type == best.key }.map { it.second }.sortedByDescending { it.weight }
        return Classification(best.key, margin * evidence, reasons, options, scores)
    }

    /** Each signal counts once, at its first match in reading order. */
    private fun findSignals(pages: List<TextPage>): List<Pair<Signal, Reason>> {
        val found = linkedMapOf<Signal, Reason>()
        for (page in pages) {
            for (block in page.blocks) {
                val raw = block.text.uppercase()
                val folded = undoOcrConfusions(block.text.folded())
                for (signal in signals) {
                    if (signal in found) continue
                    if (signal.pattern.containsMatchIn(if (signal.raw) raw else folded)) {
                        found[signal] = Reason(signal.id, signal.weight, page.number, block.box, block.text)
                    }
                }
            }
        }
        return found.toList()
    }

    private companion object {
        const val OPTIONS = 3
        const val NO_EVIDENCE_RULE = "classify.other.no_evidence"
        val MIXED_WORD = Regex("\\p{L}*\\d[\\p{L}\\d]*")
        val DIGIT_AS_LETTER = mapOf('0' to 'o', '1' to 'l', '5' to 's', '8' to 'b')

        /** In words that mix letters and digits ("n0mina"), OCR read letters as digits; numbers stay untouched. */
        fun undoOcrConfusions(text: String): String =
            MIXED_WORD.replace(text) { match ->
                val word = match.value
                if (word.any { it.isLetter() } && word.count { it.isDigit() } < word.length / 2) {
                    word.map { DIGIT_AS_LETTER[it] ?: it }.joinToString("")
                } else {
                    word
                }
            }
    }
}
