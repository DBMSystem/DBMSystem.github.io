package com.dbmsystem.papeles.core.db

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun database(
        @ApplicationContext context: Context,
    ): PapelesDatabase = PapelesDatabase.build(context)

    @Provides
    fun documentDao(database: PapelesDatabase): DocumentDao = database.documentDao()

    @Provides
    fun fieldDao(database: PapelesDatabase): FieldDao = database.fieldDao()

    @Provides
    fun seriesDao(database: PapelesDatabase): SeriesDao = database.seriesDao()

    @Provides
    fun changeDao(database: PapelesDatabase): ChangeDao = database.changeDao()

    @Provides
    fun eventDao(database: PapelesDatabase): EventDao = database.eventDao()

    @Provides
    fun reminderDao(database: PapelesDatabase): ReminderDao = database.reminderDao()

    @Provides
    fun appSettingDao(database: PapelesDatabase): AppSettingDao = database.appSettingDao()
}
