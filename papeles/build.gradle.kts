plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.android.lint) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.room) apply false
    alias(libs.plugins.ktlint) apply false
}

// Forbidden words, missing accents and hardcoded UI text (CLAUDE.md, rules 2 and 9).
// Every module's `lint` and the app's `preBuild` depend on this task.
tasks.register<Exec>("lintStrings") {
    group = "verification"
    description = "Checks UI strings for forbidden words, missing accents and hardcoded text."
    commandLine("python3", "tools/lint_strings.py", rootDir.absolutePath)
}
