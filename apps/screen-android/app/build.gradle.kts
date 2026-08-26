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
    buildTypes {
        debug { manifestPlaceholders["allowCleartext"] = true; buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8080\""); buildConfigField("boolean", "USE_MOCK_BACKEND", "true"); buildConfigField("boolean", "ALLOW_DEMO_PAIRING", "true"); buildConfigField("String", "DEFAULT_TIMEZONE", "\"Asia/Kolkata\""); buildConfigField("int", "HEARTBEAT_INTERVAL_MINUTES", "15") }
        release { isMinifyEnabled = false; manifestPlaceholders["allowCleartext"] = false; buildConfigField("String", "API_BASE_URL", "\"https://api.example.invalid\""); buildConfigField("boolean", "USE_MOCK_BACKEND", "false"); buildConfigField("boolean", "ALLOW_DEMO_PAIRING", "false"); buildConfigField("String", "DEFAULT_TIMEZONE", "\"Asia/Kolkata\""); buildConfigField("int", "HEARTBEAT_INTERVAL_MINUTES", "15") }
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
    testImplementation("junit:junit:4.13.2")
}
