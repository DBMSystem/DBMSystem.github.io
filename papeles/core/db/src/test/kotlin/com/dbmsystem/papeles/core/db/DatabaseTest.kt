package com.dbmsystem.papeles.core.db

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.Origin
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.Instant

/** In-memory database per test, plus builders with valid defaults. */
@RunWith(RobolectricTestRunner::class)
abstract class DatabaseTest {
    protected lateinit var db: PapelesDatabase

    @Before
    fun openDatabase() {
        db =
            Room
                .inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), PapelesDatabase::class.java)
                .allowMainThreadQueries()
                .build()
    }

    @After
    fun closeDatabase() {
        db.close()
    }

    protected fun document(
        id: String,
        type: DocumentType = DocumentType.PAYSLIP,
        seriesId: String? = null,
        createdAt: Instant = Instant.parse("2026-09-30T10:00:00Z"),
    ) = Document(id, type, Origin.DETECTED, 0.9f, seriesId, createdAt)

    protected fun field(
        id: String,
        documentId: String,
        key: String = "net",
        value: String = "1.234,56",
        origin: Origin = Origin.DETECTED,
    ) = Field(id, documentId, key, value, origin, 0.8f, page = 1, box = null, ruleId = "test.$key")
}
