package com.dbmsystem.papeles.core.model

/** Dated events the V1 tracks, one per date column of the document type table in CLAUDE.md. */
enum class EventKind {
    RENEWAL,
    EXPIRY,
    RETURN_DEADLINE,
    WARRANTY_END,
    TRIAL_END,
    ITV,
    VEHICLE_SERVICE,
    CONTRACT_DATE,
    PAYDAY,
}
