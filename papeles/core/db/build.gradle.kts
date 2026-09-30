plugins {
    id("papeles.android.library")
}

android {
    namespace = "com.dbmsystem.papeles.core.db"
}

dependencies {
    implementation(project(":core:model"))
}
