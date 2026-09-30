plugins {
    id("papeles.android.feature")
}

android {
    namespace = "com.dbmsystem.papeles.feature.capture"
}

dependencies {
    implementation(project(":core:model"))
}
