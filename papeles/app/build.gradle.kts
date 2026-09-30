plugins {
    id("papeles.android.application")
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.dbmsystem.papeles"

    defaultConfig {
        applicationId = "com.dbmsystem.papeles"
        versionCode = 1
        versionName = "0.1.0"
    }

    androidResources {
        localeFilters += "es"
    }
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:db"))
    implementation(project(":core:text"))
    implementation(project(":core:classify"))
    implementation(project(":core:extract"))
    implementation(project(":core:diff"))
    implementation(project(":core:dates"))
    implementation(project(":core:notify"))
    implementation(project(":feature:today"))
    implementation(project(":feature:capture"))
    implementation(project(":feature:review"))
    implementation(project(":feature:changes"))
    implementation(project(":feature:settings"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    testImplementation(libs.junit)
}
