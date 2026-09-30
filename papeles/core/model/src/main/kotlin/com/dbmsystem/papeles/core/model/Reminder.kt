package com.dbmsystem.papeles.core.model

/** The three reminder types of M7: a date approaching, a change after an upload and the optional monthly payslip. */
enum class ReminderKind {
    DATE,
    CHANGE,
    MONTHLY_PAYSLIP,
}

enum class ReminderStatus {
    SCHEDULED,
    DELIVERED,
    CANCELLED,
}
