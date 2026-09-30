package com.dbmsystem.papeles.core.db

import android.database.sqlite.SQLiteException
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
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate

class DocumentDaoTest : DatabaseTest() {
    private val dao get() = db.documentDao()

    @Test
    fun `saves a document with its pages and fields`() =
        runTest {
            val pages = listOf(Page("p2", "d1", 2, null), Page("p1", "d1", 1, "pages/d1-1.jpg"))
            dao.insertWithContents(document("d1"), pages, listOf(field("f1", "d1")))

            assertEquals(document("d1"), dao.get("d1"))
            assertEquals(listOf(1, 2), dao.pages("d1").map { it.number })
            assertEquals(listOf("f1"), db.fieldDao().byDocument("d1").map { it.id })
        }

    @Test
    fun `saving is all or nothing`() =
        runTest {
            val duplicatedPage = listOf(Page("p1", "d1", 1, null), Page("p2", "d1", 1, null))
            val result = runCatching { dao.insertWithContents(document("d1"), duplicatedPage, emptyList()) }
            assertTrue(result.exceptionOrNull() is SQLiteException)
            assertNull(dao.get("d1"))
        }

    @Test
    fun `lists newest first and a series oldest first`() =
        runTest {
            db.seriesDao().insert(Series("s1", DocumentType.PAYSLIP, "b12345678"))
            dao.insert(document("sep", seriesId = "s1", createdAt = Instant.parse("2026-09-30T10:00:00Z")))
            dao.insert(document("oct", createdAt = Instant.parse("2026-10-31T10:00:00Z")))
            dao.assignSeries("oct", "s1")

            assertEquals(listOf("oct", "sep"), dao.observeAll().first().map { it.id })
            assertEquals(listOf("sep", "oct"), dao.bySeries("s1").map { it.id })
            assertEquals(db.seriesDao().find(DocumentType.PAYSLIP, "b12345678")?.id, "s1")
            assertNull(db.seriesDao().find(DocumentType.UTILITY_BILL, "b12345678"))
        }

    @Test
    fun `deleting a document deletes everything that depends on it`() =
        runTest {
            db.seriesDao().insert(Series("s1", DocumentType.PAYSLIP, "b12345678"))
            dao.insertWithContents(
                document("d1", seriesId = "s1"),
                listOf(Page("p1", "d1", 1, null)),
                listOf(field("f1", "d1")),
            )
            dao.insert(document("d2", seriesId = "s1"))
            val change = Change("c1", "s1", "d1", "d2", "net", "1.000,00", "1.050,00", ChangeKind.UP, Origin.DETECTED)
            db.changeDao().insertAll(listOf(change))
            db.eventDao().upsert(
                Event("e1", "d1", "f1", EventKind.PAYDAY, LocalDate.of(2026, 10, 31), Origin.ESTIMATED),
            )
            val reminder =
                Reminder(
                    "r1",
                    ReminderKind.DATE,
                    "e1",
                    null,
                    null,
                    Instant.parse("2026-10-30T08:00:00Z"),
                    ReminderStatus.SCHEDULED,
                )
            db.reminderDao().upsert(reminder)

            dao.delete("d1")

            assertTrue(dao.pages("d1").isEmpty())
            assertTrue(db.fieldDao().byDocument("d1").isEmpty())
            assertTrue(db.changeDao().between("d1", "d2").isEmpty())
            assertTrue(db.eventDao().byDocument("d1").isEmpty())
            assertTrue(db.reminderDao().byEvent("e1").isEmpty())
            assertEquals(listOf("d2"), dao.bySeries("s1").map { it.id })
        }
}
