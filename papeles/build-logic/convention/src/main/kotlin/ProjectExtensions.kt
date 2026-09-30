import com.android.build.api.dsl.CommonExtension
import com.android.build.api.dsl.Lint
import org.gradle.api.JavaVersion
import org.gradle.api.Project
import org.gradle.api.artifacts.VersionCatalog
import org.gradle.api.artifacts.VersionCatalogsExtension
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.getByType
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinJvmCompilerOptions
import org.jlleitschuh.gradle.ktlint.KtlintExtension

internal val Project.libs: VersionCatalog
    get() = extensions.getByType<VersionCatalogsExtension>().named("libs")

internal fun VersionCatalog.version(alias: String): String = findVersion(alias).get().requiredVersion

internal val Project.javaVersion: JavaVersion
    get() = JavaVersion.toVersion(libs.version("jvm-target"))

internal fun KotlinJvmCompilerOptions.configureJvmTarget(project: Project) {
    jvmTarget.set(JvmTarget.fromTarget(project.libs.version("jvm-target")))
}

internal fun Project.configureAndroid(android: CommonExtension<*, *, *, *, *, *>) {
    android.apply {
        compileSdk = libs.version("compile-sdk").toInt()
        defaultConfig.minSdk = libs.version("min-sdk").toInt()
        compileOptions {
            sourceCompatibility = javaVersion
            targetCompatibility = javaVersion
        }
        testOptions.unitTests.isIncludeAndroidResources = true
        lint.configureLint()
    }
}

internal fun Lint.configureLint() {
    abortOnError = true
    // UI text must live in strings.xml (CLAUDE.md, rule 9).
    error += "HardcodedText"
    // Version-freshness checks depend on the network and are reviewed by hand.
    disable += setOf("GradleDependency", "AndroidGradlePluginVersion", "NewerVersionAvailable", "OldTargetApi")
}

/**
 * Wires the shared quality gates into every module: `lint` also runs ktlint and the
 * forbidden-strings script, so `./gradlew test lint` covers everything.
 */
internal fun Project.configureQualityGates() {
    pluginManager.apply("org.jlleitschuh.gradle.ktlint")
    extensions.configure<KtlintExtension> { version.set(libs.version("ktlint")) }
    tasks.matching { it.name == "lint" }.configureEach {
        dependsOn("ktlintCheck", ":lintStrings")
    }
}
