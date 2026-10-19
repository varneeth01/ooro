plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.kapt")
}

kapt { correctErrorTypes = true }

android { namespace = "com.ooro.screenplayer"; compileSdk = 35
    defaultConfig { applicationId = "com.ooro.screenplayer"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.15" }
    val configuredRepairAccessCode = (project.findProperty("repairAccessCode")?.toString()
        ?: System.getenv("OORO_REPAIR_ACCESS_CODE"))?.trim().orEmpty()
    val debugRepairAccessCode = configuredRepairAccessCode
    val releaseApiUrl = (project.findProperty("deviceApiBaseUrl")?.toString() ?: System.getenv("OORO_DEVICE_API_URL"))?.trim()?.trimEnd('/').orEmpty()
    if (gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) }) {
        require(releaseApiUrl.startsWith("https://")) { "Release requires deviceApiBaseUrl/OORO_DEVICE_API_URL pointing to the HTTPS device API" }
    }
    buildTypes {
        debug {
            val useMockBackend = (project.findProperty("useMockBackend")?.toString()
                ?: System.getenv("OORO_USE_MOCK_BACKEND"))?.toBoolean() ?: false
            val configuredApiUrl = (project.findProperty("deviceApiBaseUrl")?.toString() ?: System.getenv("OORO_DEVICE_API_URL"))?.trim()?.trimEnd().orEmpty()
            require(useMockBackend || configuredApiUrl.isNotBlank()) { "Real debug builds require -PdeviceApiBaseUrl or OORO_DEVICE_API_URL; useMockBackend must be explicitly enabled for mock mode" }
            val apiBaseUrl = if (useMockBackend) "mock://local" else configuredApiUrl
            require(apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://") || (useMockBackend && apiBaseUrl.startsWith("mock://"))) { "deviceApiBaseUrl must be an http(s) URL" }
            manifestPlaceholders["allowCleartext"] = true
            buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
            buildConfigField("boolean", "USE_MOCK_BACKEND", useMockBackend.toString())
            buildConfigField("boolean", "ALLOW_DEMO_PAIRING", "true")
            buildConfigField("String", "REPAIR_ACCESS_CODE", "\"$debugRepairAccessCode\"")
            buildConfigField("String", "DEFAULT_TIMEZONE", "\"Asia/Kolkata\"")
            buildConfigField("int", "HEARTBEAT_INTERVAL_MINUTES", "15")
            val syncIntervalSeconds = (project.findProperty("syncIntervalSeconds")?.toString()
                ?: System.getenv("OORO_SYNC_INTERVAL_SECONDS")
                ?: "15").toIntOrNull()?.coerceIn(5, 300) ?: 15
            buildConfigField("int", "SYNC_INTERVAL_SECONDS", syncIntervalSeconds.toString())
        }
        release { isMinifyEnabled = true; isShrinkResources = true; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt")); manifestPlaceholders["allowCleartext"] = false; buildConfigField("String", "API_BASE_URL", "\"$releaseApiUrl\""); buildConfigField("boolean", "USE_MOCK_BACKEND", "false"); buildConfigField("boolean", "ALLOW_DEMO_PAIRING", "false"); buildConfigField("String", "REPAIR_ACCESS_CODE", "\"$configuredRepairAccessCode\""); buildConfigField("String", "DEFAULT_TIMEZONE", "\"Asia/Kolkata\""); buildConfigField("int", "HEARTBEAT_INTERVAL_MINUTES", "15"); buildConfigField("int", "SYNC_INTERVAL_SECONDS", "90") }
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")
    kaptTest("junit:junit:4.13.2")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")
    implementation("org.maplibre.gl:android-sdk:11.5.1")
    implementation("com.google.zxing:core:3.5.3")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
