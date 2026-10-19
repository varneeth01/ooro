plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.kapt")
}

android {
    namespace = "com.ooro.deviceagent"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.ooro.deviceagent"
        minSdk = 26
        targetSdk = 35
        versionCode = project.findProperty("deviceVersionCode")?.toString()?.toIntOrNull() ?: 1
        versionName = project.findProperty("deviceVersionName")?.toString() ?: "0.1.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
    val releaseApiUrl = (project.findProperty("deviceApiBaseUrl")?.toString() ?: System.getenv("OORO_DEVICE_API_URL"))?.trim()?.trimEnd('/').orEmpty()
    if (gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) }) require(releaseApiUrl.startsWith("https://")) { "Release requires an HTTPS device API URL" }
    buildTypes {
        debug {
            val apiUrl = (project.findProperty("deviceApiBaseUrl")?.toString() ?: System.getenv("OORO_DEVICE_API_URL") ?: "http://10.0.2.2:8080").trim().trimEnd('/')
            manifestPlaceholders["allowCleartext"] = true
            buildConfigField("String", "API_BASE_URL", "\"$apiUrl\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            manifestPlaceholders["allowCleartext"] = false
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiUrl\"")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
