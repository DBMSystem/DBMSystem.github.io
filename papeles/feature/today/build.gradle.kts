plugins {
    id("papeles.android.feature")
}

android {
    namespace = "com.dbmsystem.papeles.feature.today"
}

dependencies {
    implementation(project(":core:model"))
}
