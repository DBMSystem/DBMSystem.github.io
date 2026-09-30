import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies
import org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension

/** Pure Kotlin modules (domain logic without Android): fast JVM tests and Android lint via `com.android.lint`. */
class JvmLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) =
        with(target) {
            pluginManager.apply("org.jetbrains.kotlin.jvm")
            pluginManager.apply("com.android.lint")
            extensions.configure<JavaPluginExtension> {
                sourceCompatibility = javaVersion
                targetCompatibility = javaVersion
            }
            extensions.configure<KotlinJvmProjectExtension> { compilerOptions.configureJvmTarget(this@with) }
            extensions.configure<com.android.build.api.dsl.Lint> { configureLint() }
            dependencies { add("testImplementation", libs.findLibrary("junit").get()) }
            configureQualityGates()
        }
}
