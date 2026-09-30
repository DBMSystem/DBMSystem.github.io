package com.dbmsystem.papeles.core.db

import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Every exported schema (core/db/schemas) must open as the current database through MIGRATIONS. Room checks the
 * schema identity on open, so this also fails when the committed schema is out of date.
 */
@RunWith(RobolectricTestRunner::class)
class SchemaTest {
    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), PapelesDatabase::class.java)

    @Test
    fun `every exported version opens as the current database`() {
        for (version in 1..CURRENT_VERSION) {
            val name = "schema-$version.db"
            helper.createDatabase(name, version).close()
            Room
                .databaseBuilder(ApplicationProvider.getApplicationContext(), PapelesDatabase::class.java, name)
                .addMigrations(*MIGRATIONS)
                .allowMainThreadQueries()
                .build()
                .apply { openHelper.writableDatabase }
                .close()
        }
    }

    private companion object {
        const val CURRENT_VERSION = 1
    }
}
