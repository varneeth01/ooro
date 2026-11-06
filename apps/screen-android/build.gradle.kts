plugins {
    id("com.android.application") version "8.6.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.25" apply false
    id("org.jetbrains.kotlin.kapt") version "1.9.25" apply false
}

// Task-graph readiness runs before any task action, including connected-test APK install tasks.
gradle.taskGraph.whenReady {
    val requestsConnectedInstrumentation = allTasks.any { task ->
        task.name.contains("connected", ignoreCase = true) &&
            task.name.contains("AndroidTest", ignoreCase = true)
    }
    if (requestsConnectedInstrumentation) {
        val serial = System.getenv("OORO_DISPOSABLE_EMULATOR_SERIAL").orEmpty()
        val preflight = ProcessBuilder(
            "python3",
            rootProject.file("scripts/connected-test-safe.py").absolutePath,
            "--serial",
            serial,
            "--preflight-only",
        ).inheritIO().start()
        val result = preflight.waitFor()
        if (result != 0) {
            throw GradleException("Connected instrumentation refused: disposable-emulator preflight failed")
        }
    }
}
