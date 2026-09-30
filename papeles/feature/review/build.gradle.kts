plugins {
    id("papeles.android.feature")
}

android {
    namespace = "com.dbmsystem.papeles.feature.review"
}

dependencies {
    implementation(project(":core:model"))
}
