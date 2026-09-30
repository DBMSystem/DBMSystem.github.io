package com.dbmsystem.papeles.core.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import com.dbmsystem.papeles.core.model.DocumentType
import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.time.LocalDate

@Dao
abstract class DocumentDao {
    @Insert
    abstract suspend fun insert(document: Document)

    @Insert
    abstract suspend fun insertPages(pages: List<Page>)

    @Insert
    abstract suspend fun insertFields(fields: List<Field>)

    /** Saves a reviewed document with its pages and fields, all or nothing (pipeline step 6). */
    @Transaction
    open suspend fun insertWithContents(
        document: Document,
        pages: List<Page>,
        fields: List<Field>,
    ) {
        insert(document)
        insertPages(pages)
        insertFields(fields)
    }

    @Query("SELECT * FROM documents WHERE id = :id")
    abstract suspend fun get(id: String): Document?

    @Query("SELECT * FROM documents ORDER BY createdAt DESC")
    abstract fun observeAll(): Flow<List<Document>>

    @Query("SELECT * FROM documents WHERE seriesId = :seriesId ORDER BY createdAt")
    abstract suspend fun bySeries(seriesId: String): List<Document>

    @Query("UPDATE documents SET seriesId = :seriesId WHERE id = :id")
    abstract suspend fun assignSeries(
        id: String,
        seriesId: String,
    )

    @Query("SELECT * FROM pages WHERE documentId = :documentId ORDER BY number")
    abstract suspend fun pages(documentId: String): List<Page>

    /** Also deletes its pages, fields, changes, events and their reminders (foreign keys cascade). */
    @Query("DELETE FROM documents WHERE id = :id")
    abstract suspend fun delete(id: String)
}

@Dao
interface FieldDao {
    @Upsert
    suspend fun upsert(field: Field)

    @Query("SELECT * FROM fields WHERE documentId = :documentId ORDER BY `key`")
    suspend fun byDocument(documentId: String): List<Field>
}

@Dao
interface SeriesDao {
    @Insert
    suspend fun insert(series: Series)

    @Query("SELECT * FROM series WHERE type = :type AND `key` = :key")
    suspend fun find(
        type: DocumentType,
        key: String,
    ): Series?
}

@Dao
interface ChangeDao {
    @Insert
    suspend fun insertAll(changes: List<Change>)

    @Query(
        "SELECT * FROM changes WHERE fromDocumentId = :fromDocumentId AND toDocumentId = :toDocumentId ORDER BY fieldKey",
    )
    suspend fun between(
        fromDocumentId: String,
        toDocumentId: String,
    ): List<Change>
}

@Dao
interface EventDao {
    @Upsert
    suspend fun upsert(event: Event)

    @Query("SELECT * FROM events WHERE date BETWEEN :from AND :to ORDER BY date")
    fun observeBetween(
        from: LocalDate,
        to: LocalDate,
    ): Flow<List<Event>>

    @Query("SELECT * FROM events WHERE documentId = :documentId ORDER BY date")
    suspend fun byDocument(documentId: String): List<Event>
}

@Dao
interface ReminderDao {
    @Upsert
    suspend fun upsert(reminder: Reminder)

    @Query("SELECT * FROM reminders WHERE status = 'SCHEDULED' AND triggerAt <= :now ORDER BY triggerAt")
    suspend fun due(now: Instant): List<Reminder>

    @Query("SELECT * FROM reminders WHERE eventId = :eventId")
    suspend fun byEvent(eventId: String): List<Reminder>
}

@Dao
interface AppSettingDao {
    @Upsert
    suspend fun put(setting: AppSetting)

    @Query("SELECT value FROM app_settings WHERE `key` = :key")
    suspend fun get(key: String): String?

    @Query("SELECT value FROM app_settings WHERE `key` = :key")
    fun observe(key: String): Flow<String?>
}
