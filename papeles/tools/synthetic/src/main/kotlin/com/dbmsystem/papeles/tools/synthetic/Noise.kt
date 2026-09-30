package com.dbmsystem.papeles.tools.synthetic

import com.dbmsystem.papeles.core.model.TextPage
import java.text.Normalizer
import kotlin.random.Random

/** Character confusions typical of OCR on phone photos. */
private val CONFUSIONS =
    mapOf(
        'o' to "0",
        'O' to "0",
        'l' to "1",
        'I' to "1",
        'S' to "5",
        'e' to "c",
        'm' to "rn",
        'B' to "8",
    )

private val ACCENTS = Regex("\\p{Mn}+")

internal fun applyNoise(
    page: TextPage,
    noise: TextNoise,
    random: Random,
): TextPage {
    val confusionRate =
        when (noise) {
            TextNoise.CLEAN, TextNoise.NO_ACCENTS -> 0.0
            TextNoise.OCR_LIGHT -> 0.01
            TextNoise.OCR_HEAVY -> 0.03
        }
    val dropAccents = noise == TextNoise.NO_ACCENTS || noise == TextNoise.OCR_HEAVY
    return page.copy(
        blocks =
            page.blocks.map { block ->
                var text = block.text
                if (dropAccents) text = Normalizer.normalize(text, Normalizer.Form.NFD).replace(ACCENTS, "")
                if (confusionRate > 0) text = confuse(text, confusionRate, random)
                block.copy(text = text, confidence = if (noise == TextNoise.CLEAN) 1f else 0.8f)
            },
    )
}

private fun confuse(
    text: String,
    rate: Double,
    random: Random,
): String =
    buildString {
        for (char in text) {
            val replacement = CONFUSIONS[char]
            append(if (replacement != null && random.nextDouble() < rate) replacement else char.toString())
        }
    }
