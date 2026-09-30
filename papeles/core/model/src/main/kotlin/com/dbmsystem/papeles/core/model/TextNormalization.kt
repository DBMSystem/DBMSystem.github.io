package com.dbmsystem.papeles.core.model

import java.text.Normalizer

private val COMBINING_MARKS = Regex("\\p{Mn}+")
private val WHITESPACE = Regex("\\s+")

/** Lowercase, without accents or ñ and with single spaces: "LÍQUIDO  a Percibir" becomes "liquido a percibir". */
fun String.folded(): String =
    Normalizer
        .normalize(lowercase(), Normalizer.Form.NFD)
        .replace(COMBINING_MARKS, "")
        .replace(WHITESPACE, " ")
        .trim()
