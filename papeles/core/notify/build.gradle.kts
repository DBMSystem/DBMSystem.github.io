plugins {
    id("papeles.android.library")
}

android {
    namespace = "com.dbmsystem.papeles.core.notify"
}

dependencies {
    implementation(project(":core:model"))
}
