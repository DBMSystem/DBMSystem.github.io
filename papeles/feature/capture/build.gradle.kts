plugins {
    id("papeles.android.feature")
}

android {
    namespace = "com.dbmsystem.papeles.feature.capture"
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:text"))
    implementation(libs.androidx.activity.compose)
    implementation(libs.mlkit.document.scanner)

    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.coroutines.test)
}
