package com.dbmsystem.papeles.core.db

import android.database.sqlite.SQLiteException
import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.Origin
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

/** M1 "Listo cuando": no Field can be saved without origin, confidence and ruleId. */
class FieldProvenanceTest : DatabaseTest() {
    @Test
    fun `a field keeps its full provenance`() =
        runTest {
            db.documentDao().insert(document("d1"))
            val saved =
                Field(
                    id = "f1",
                    documentId = "d1",
                    key = "gross",
                    value = "2.000,00",
                    origin = Origin.USER_CONFIRMED,
                    confidence = 1f,
                    page = 2,
                    box = BoundingBox(0.1f, 0.4f, 0.3f, 0.45f),
                    ruleId = "payslip.generic.gross",
                )
            db.fieldDao().upsert(saved)
            assertEquals(listOf(saved), db.fieldDao().byDocument("d1"))
        }

    @Test
    fun `a field cannot be built without ruleId or with a confidence outside 0 to 1`() {
        assertThrows(IllegalArgumentException::class.java) { field("f1", "d1").copy(ruleId = " ") }
        assertThrows(IllegalArgumentException::class.java) { field("f1", "d1").copy(confidence = 1.01f) }
        assertThrows(IllegalArgumentException::class.java) { field("f1", "d1").copy(confidence = -0.1f) }
        assertThrows(IllegalArgumentException::class.java) { field("f1", "d1").copy(confidence = Float.NaN) }
        assertThrows(IllegalArgumentException::class.java) { field("f1", "d1").copy(page = 0) }
    }

    @Test
    fun `the table rejects a field without origin, confidence or ruleId`() =
        runTest {
            db.documentDao().insert(document("d1"))
            val sql = db.openHelper.writableDatabase
            val columns = "id, documentId, `key`, value"
            val values = "'x', 'd1', 'net', '1'"
            listOf(
                "INSERT INTO fields ($columns, confidence, ruleId) VALUES ($values, 0.5, 'r')",
                "INSERT INTO fields ($columns, origin, ruleId) VALUES ($values, 'DETECTED', 'r')",
                "INSERT INTO fields ($columns, origin, confidence) VALUES ($values, 'DETECTED', 0.5)",
            ).forEach { insert ->
                assertThrows(insert, SQLiteException::class.java) { sql.execSQL(insert) }
            }
        }

    @Test
    fun `a field must belong to an existing document`() =
        runTest {
            val result = runCatching { db.fieldDao().upsert(field("f1", "missing")) }
            assertTrue(result.exceptionOrNull() is SQLiteException)
        }
}
