package com.dbmsystem.papeles.core.model

/** How a field differs between two documents of the same series. */
enum class ChangeKind {
    UP,
    DOWN,
    ADDED,
    REMOVED,
    ;

    /** Whether a change of this kind has a value before and after (ADDED has no before, REMOVED no after). */
    fun isConsistent(
        before: String?,
        after: String?,
    ): Boolean =
        when (this) {
            UP, DOWN -> before != null && after != null
            ADDED -> before == null && after != null
            REMOVED -> before != null && after == null
        }
}
