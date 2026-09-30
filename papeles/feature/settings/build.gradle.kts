plugins {
    id("papeles.android.feature")
}

android {
    namespace = "com.dbmsystem.papeles.feature.settings"
}

dependencies {
    implementation(project(":core:model"))
}
