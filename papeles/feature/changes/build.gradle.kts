plugins {
    id("papeles.android.feature")
}

android {
    namespace = "com.dbmsystem.papeles.feature.changes"
}

dependencies {
    implementation(project(":core:model"))
}
