package com.dbmsystem.papeles.core.model

/**
 * Where a datum comes from (CLAUDE.md, rule 4). Declared from weakest to strongest: the declaration order is the
 * strength order, and it is only ever stored by name, so reordering never corrupts saved data.
 */
enum class Origin {
    /** Inferred without a direct source, e.g. a date computed from a period. Shown as "Estimada". */
    ESTIMATED,

    /** Read from the document by a rule. Shown as "Detectada". */
    DETECTED,

    /** Confirmed or corrected by the user. Shown as "Confirmada por ti". */
    USER_CONFIRMED,

    /** Checked against an external source. */
    VERIFIED_EXTERNAL,
}

/** The origin of a derived datum: the weakest of the origins it is built from. */
fun weakest(vararg origins: Origin): Origin {
    require(origins.isNotEmpty()) { "A derived datum needs at least one source origin." }
    return origins.minOf { it }
}
