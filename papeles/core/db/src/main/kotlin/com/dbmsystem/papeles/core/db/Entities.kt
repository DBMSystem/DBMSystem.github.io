package com.dbmsystem.papeles.core.db

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.ChangeKind
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.EventKind
import com.dbmsystem.papeles.core.model.Origin
import com.dbmsystem.papeles.core.model.ReminderKind
import com.dbmsystem.papeles.core.model.ReminderStatus
import java.time.Instant
import java.time.LocalDate

/** Documents of the same kind and issuer (same employer, same supply) that are compared with each other. */
@Entity(tableName = "series", indices = [Index(value = ["type", "key"], unique = true)])
data class Series(
    @PrimaryKey val id: String,
    val type: DocumentType,
    /** Normalised issuer, e.g. the employer's tax id or the supply point. */
    val key: String,
)

@Entity(
    tableName = "documents",
    foreignKeys = [
        ForeignKey(Series::class, ["id"], ["seriesId"], onDelete = ForeignKey.SET_NULL),
    ],
    indices = [Index("seriesId")],
)
data class Document(
    @PrimaryKey val id: String,
    val type: DocumentType,
    /** The type is a datum too: detected by the classifier or chosen by the user. */
    val typeOrigin: Origin,
    val typeConfidence: Float,
    val seriesId: String?,
    val createdAt: Instant,
) {
    init {
        require(typeConfidence in 0f..1f) { "Confidence must be within 0..1." }
    }
}

@Entity(
    tableName = "pages",
    foreignKeys = [
        ForeignKey(Document::class, ["id"], ["documentId"], onDelete = ForeignKey.CASCADE),
    ],
    indices = [Index(value = ["documentId", "number"], unique = true)],
)
data class Page(
    @PrimaryKey val id: String,
    val documentId: String,
    /** 1-based, as shown to the user ("Fuente: página 2"). */
    val number: Int,
    /** Page image in app-private storage, if kept. */
    val filePath: String?,
) {
    init {
        require(number >= 1) { "Pages are numbered from 1." }
    }
}

/**
 * One extracted datum with its provenance (CLAUDE.md, rule 4). Origin, confidence and ruleId are non-null columns
 * and are checked here, so a field without provenance can neither be built nor stored.
 */
@Entity(
    tableName = "fields",
    foreignKeys = [
        ForeignKey(Document::class, ["id"], ["documentId"], onDelete = ForeignKey.CASCADE),
    ],
    indices = [Index("documentId")],
)
data class Field(
    @PrimaryKey val id: String,
    val documentId: String,
    /** E.g. "gross", "net", "irpfPercent", "renewalDate". */
    val key: String,
    val value: String,
    val origin: Origin,
    val confidence: Float,
    val page: Int?,
    val box: BoundingBox?,
    /** The rule that produced the value. */
    val ruleId: String,
) {
    init {
        require(ruleId.isNotBlank()) { "Every field needs the ruleId that produced it." }
        require(confidence in 0f..1f) { "Confidence must be within 0..1." }
        require(page == null || page >= 1) { "Pages are numbered from 1." }
    }
}

@Entity(
    tableName = "changes",
    foreignKeys = [
        ForeignKey(Series::class, ["id"], ["seriesId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(Document::class, ["id"], ["fromDocumentId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(Document::class, ["id"], ["toDocumentId"], onDelete = ForeignKey.CASCADE),
    ],
    indices = [Index("seriesId"), Index("fromDocumentId"), Index("toDocumentId")],
)
data class Change(
    @PrimaryKey val id: String,
    val seriesId: String,
    val fromDocumentId: String,
    val toDocumentId: String,
    val fieldKey: String,
    /** Null when the concept is ADDED. */
    val before: String?,
    /** Null when the concept is REMOVED. */
    val after: String?,
    val kind: ChangeKind,
    /** A change is derived data: the weakest origin of the two values compared. */
    val origin: Origin,
) {
    init {
        require(fromDocumentId != toDocumentId) { "A change compares two different documents." }
        require(kind.isConsistent(before, after)) { "$kind does not match the values before and after." }
    }
}

@Entity(
    tableName = "events",
    foreignKeys = [
        ForeignKey(Document::class, ["id"], ["documentId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(Field::class, ["id"], ["fieldId"], onDelete = ForeignKey.SET_NULL),
    ],
    indices = [Index("documentId"), Index("fieldId"), Index("date")],
)
data class Event(
    @PrimaryKey val id: String,
    val documentId: String?,
    /** The field the date was read from, when there is one. */
    val fieldId: String?,
    val kind: EventKind,
    val date: LocalDate,
    /** ESTIMATED dates are shown as estimated; a date is never invented (CLAUDE.md, rule 5). */
    val origin: Origin,
)

@Entity(
    tableName = "reminders",
    foreignKeys = [
        ForeignKey(Event::class, ["id"], ["eventId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(Change::class, ["id"], ["changeId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(Series::class, ["id"], ["seriesId"], onDelete = ForeignKey.CASCADE),
    ],
    indices = [Index("eventId"), Index("changeId"), Index("seriesId"), Index("status", "triggerAt")],
)
data class Reminder(
    @PrimaryKey val id: String,
    val kind: ReminderKind,
    val eventId: String?,
    val changeId: String?,
    val seriesId: String?,
    val triggerAt: Instant,
    val status: ReminderStatus,
) {
    init {
        val target =
            when (kind) {
                ReminderKind.DATE -> eventId
                ReminderKind.CHANGE -> changeId
                ReminderKind.MONTHLY_PAYSLIP -> seriesId
            }
        require(target != null) { "A $kind reminder needs what it reminds about." }
    }
}

@Entity(tableName = "app_settings")
data class AppSetting(
    @PrimaryKey val key: String,
    val value: String,
)
