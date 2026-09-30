import com.android.build.api.dsl.ApplicationExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.jetbrains.kotlin.gradle.dsl.KotlinAndroidProjectExtension

class AndroidApplicationConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) =
        with(target) {
            pluginManager.apply("com.android.application")
            pluginManager.apply("org.jetbrains.kotlin.android")
            pluginManager.apply("org.jetbrains.kotlin.plugin.compose")
            extensions.configure<ApplicationExtension> {
                configureAndroid(this)
                defaultConfig.targetSdk = libs.version("target-sdk").toInt()
                buildFeatures.compose = true
            }
            extensions.configure<KotlinAndroidProjectExtension> { compilerOptions.configureJvmTarget(this@with) }
            // The forbidden-strings check also guards every app build, not only lint.
            tasks.matching { it.name == "preBuild" }.configureEach { dependsOn(":lintStrings") }
            configureQualityGates()
        }
}
