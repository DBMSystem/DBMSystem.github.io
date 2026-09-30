plugins {
    id("papeles.android.library")
}

android {
    namespace = "com.dbmsystem.papeles.core.text"
}

dependencies {
    implementation(project(":core:model"))
}
