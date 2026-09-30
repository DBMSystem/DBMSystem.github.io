pluginManagement {
    includeBuild("build-logic")
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "papeles"

include(
    ":app",
    ":core:model",
    ":core:db",
    ":core:text",
    ":core:classify",
    ":core:extract",
    ":core:diff",
    ":core:dates",
    ":core:notify",
    ":feature:today",
    ":feature:capture",
    ":feature:review",
    ":feature:changes",
    ":feature:settings",
    ":tools:synthetic",
)
