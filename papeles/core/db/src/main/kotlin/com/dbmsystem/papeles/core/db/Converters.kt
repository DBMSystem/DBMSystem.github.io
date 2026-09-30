package com.dbmsystem.papeles.core.db

import androidx.room.TypeConverter
import com.dbmsystem.papeles.core.model.BoundingBox
import java.time.Instant
import java.time.LocalDate

/** Enums are stored by name (Room's default); these cover the remaining model types. */
internal class Converters {
    @TypeConverter
    fun instantToMillis(value: Instant): Long = value.toEpochMilli()

    @TypeConverter
    fun millisToInstant(value: Long): Instant = Instant.ofEpochMilli(value)

    @TypeConverter
    fun dateToEpochDay(value: LocalDate): Long = value.toEpochDay()

    @TypeConverter
    fun epochDayToDate(value: Long): LocalDate = LocalDate.ofEpochDay(value)

    /** Stored as "l,t,r,b" text. */
    @TypeConverter
    fun boxToText(value: BoundingBox): String = value.encode()

    @TypeConverter
    fun textToBox(value: String): BoundingBox = BoundingBox.decode(value)
}
