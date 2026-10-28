plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.kapt")
}

val configuredStagingApiUrl = providers.gradleProperty("driverStagingApiUrl").orNull ?: System.getenv("OORO_DRIVER_STAGING_API_URL")
val normalizedStagingApiUrl = configuredStagingApiUrl?.trim().orEmpty()
val stagingApiConfigured = normalizedStagingApiUrl.startsWith("https://") && normalizedStagingApiUrl.length > "https://".length

tasks.register("validateStagingConfiguration") {
    doLast {
        if (!stagingApiConfigured) {
            throw GradleException("Staging build blocked: provide -PdriverStagingApiUrl=https://... or OORO_DRIVER_STAGING_API_URL")
        }
    }
}

kapt { correctErrorTypes = true }

android {
    namespace = "com.ooro.driver"
    compileSdk = 35
    defaultConfig { applicationId = "com.ooro.driver"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0"; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"; testBuildType = "isolated" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.15" }
    buildTypes {
        debug { manifestPlaceholders["allowCleartext"] = true; buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8080\""); buildConfigField("boolean", "USE_MOCK_BACKEND", "true"); buildConfigField("boolean", "ALLOW_DEBUG_SIMULATION", "true"); buildConfigField("boolean", "INTERNAL_NOTIFICATION_FIXTURE", "true") }
        create("isolated") { initWith(getByName("debug")); applicationIdSuffix = ".isolated"; versionNameSuffix = "-isolated"; matchingFallbacks += listOf("debug") }
        create("staging") {
            initWith(getByName("release"))
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            // Internal staging is isolated by application id and uses the local
            // non-production debug identity; release remains independently signed.
            signingConfig = signingConfigs.getByName("debug")
            manifestPlaceholders["allowCleartext"] = false
            matchingFallbacks += listOf("release")
            buildConfigField("String", "API_BASE_URL", "\"${if (stagingApiConfigured) normalizedStagingApiUrl else "https://staging-endpoint-required.invalid"}\"")
            buildConfigField("boolean", "USE_MOCK_BACKEND", "false")
            buildConfigField("boolean", "ALLOW_DEBUG_SIMULATION", "false")
            buildConfigField("boolean", "INTERNAL_NOTIFICATION_FIXTURE", "false")
            buildConfigField("boolean", "STAGING_CONFIGURED", stagingApiConfigured.toString())
        }
        release { isMinifyEnabled = false; manifestPlaceholders["allowCleartext"] = false; buildConfigField("String", "API_BASE_URL", "\"https://api.example.invalid\""); buildConfigField("boolean", "USE_MOCK_BACKEND", "false"); buildConfigField("boolean", "ALLOW_DEBUG_SIMULATION", "false"); buildConfigField("boolean", "INTERNAL_NOTIFICATION_FIXTURE", "false") }
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

tasks.matching { it.name.equals("assembleStaging", ignoreCase = true) || it.name.equals("installStaging", ignoreCase = true) }.configureEach {
    dependsOn("validateStagingConfiguration")
}
tasks.matching { it.name.contains("StagingUnitTest", ignoreCase = true) }.configureEach {
    enabled = false
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
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("com.google.android.gms:play-services-base:18.5.0")
    testImplementation("junit:junit:4.13.2")
    kaptTest("junit:junit:4.13.2")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:rules:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
