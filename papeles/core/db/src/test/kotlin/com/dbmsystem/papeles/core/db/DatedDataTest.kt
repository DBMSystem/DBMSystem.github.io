package com.dbmsystem.papeles.core.db

import com.dbmsystem.papeles.core.model.ChangeKind
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.EventKind
import com.dbmsystem.papeles.core.model.Origin
import com.dbmsystem.papeles.core.model.ReminderKind
import com.dbmsystem.papeles.core.model.ReminderStatus
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import java.time.Instant
import java.time.LocalDate

class DatedDataTest : DatabaseTest() {
    @Test
    fun `changes between two documents keep before, after and kind`() =
        runTest {
            db.seriesDao().insert(Series("s1", DocumentType.PAYSLIP, "b12345678"))
            db.documentDao().insert(document("sep", seriesId = "s1"))
            db.documentDao().insert(document("oct", seriesId = "s1"))
            val changes =
                listOf(
                    Change("c1", "s1", "sep", "oct", "net", "1.000,00", "950,00", ChangeKind.DOWN, Origin.DETECTED),
                    Change("c2", "s1", "sep", "oct", "bonus", null, "50,00", ChangeKind.ADDED, Origin.DETECTED),
                )
            db.changeDao().insertAll(changes)
            assertEquals(changes.sortedBy { it.fieldKey }, db.changeDao().between("sep", "oct"))
        }

    @Test
    fun `a change must match its kind`() {
        assertThrows(IllegalArgumentException::class.java) {
            Change("c1", "s1", "sep", "oct", "bonus", "0,00", "50,00", ChangeKind.ADDED, Origin.DETECTED)
        }
        assertThrows(IllegalArgumentException::class.java) {
            Change("c1", "s1", "sep", "sep", "net", "1", "2", ChangeKind.UP, Origin.DETECTED)
        }
    }

    @Test
    fun `events come back by date range and in order`() =
        runTest {
            val itv = Event("e1", null, null, EventKind.ITV, LocalDate.of(2026, 11, 15), Origin.USER_CONFIRMED)
            val renewal = Event("e2", null, null, EventKind.RENEWAL, LocalDate.of(2026, 10, 3), Origin.DETECTED)
            val later = Event("e3", null, null, EventKind.RENEWAL, LocalDate.of(2027, 1, 1), Origin.ESTIMATED)
            listOf(itv, renewal, later).forEach { db.eventDao().upsert(it) }

            val nextMonths = db.eventDao().observeBetween(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 31)).first()
            assertEquals(listOf(renewal, itv), nextMonths)
        }

    @Test
    fun `only scheduled reminders that are due are returned`() =
        runTest {
            db.eventDao().upsert(Event("e1", null, null, EventKind.RENEWAL, LocalDate.of(2026, 10, 3), Origin.DETECTED))
            val now = Instant.parse("2026-10-01T09:00:00Z")

            fun reminder(
                id: String,
                at: Instant,
                status: ReminderStatus,
            ) = Reminder(id, ReminderKind.DATE, "e1", null, null, at, status)
            listOf(
                reminder("due", now.minusSeconds(60), ReminderStatus.SCHEDULED),
                reminder("future", now.plusSeconds(60), ReminderStatus.SCHEDULED),
                reminder("sent", now.minusSeconds(60), ReminderStatus.DELIVERED),
                reminder("cancelled", now.minusSeconds(60), ReminderStatus.CANCELLED),
            ).forEach { db.reminderDao().upsert(it) }

            assertEquals(listOf("due"), db.reminderDao().due(now).map { it.id })
        }

    @Test
    fun `a reminder needs what it reminds about`() {
        val at = Instant.parse("2026-10-01T09:00:00Z")
        assertThrows(IllegalArgumentException::class.java) {
            Reminder("r1", ReminderKind.DATE, null, "c1", null, at, ReminderStatus.SCHEDULED)
        }
        assertThrows(IllegalArgumentException::class.java) {
            Reminder("r1", ReminderKind.MONTHLY_PAYSLIP, null, null, null, at, ReminderStatus.SCHEDULED)
        }
    }

    @Test
    fun `settings are stored by key and overwritten`() =
        runTest {
            val settings = db.appSettingDao()
            assertNull(settings.get("counters.enabled"))
            settings.put(AppSetting("counters.enabled", "false"))
            settings.put(AppSetting("counters.enabled", "true"))
            assertEquals("true", settings.observe("counters.enabled").first())
        }
}
