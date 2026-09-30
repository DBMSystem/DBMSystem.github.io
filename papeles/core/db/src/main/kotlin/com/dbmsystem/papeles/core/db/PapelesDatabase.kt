package com.dbmsystem.papeles.core.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [
        Series::class,
        Document::class,
        Page::class,
        Field::class,
        Change::class,
        Event::class,
        Reminder::class,
        AppSetting::class,
    ],
    version = 1,
)
@TypeConverters(Converters::class)
abstract class PapelesDatabase : RoomDatabase() {
    abstract fun documentDao(): DocumentDao

    abstract fun fieldDao(): FieldDao

    abstract fun seriesDao(): SeriesDao

    abstract fun changeDao(): ChangeDao

    abstract fun eventDao(): EventDao

    abstract fun reminderDao(): ReminderDao

    abstract fun appSettingDao(): AppSettingDao

    companion object {
        const val NAME = "papeles.db"

        /** No destructive fallback: a schema change without its migration must fail, never wipe the user's data. */
        fun build(context: Context): PapelesDatabase =
            Room
                .databaseBuilder(context, PapelesDatabase::class.java, NAME)
                .addMigrations(*MIGRATIONS)
                .build()
    }
}
