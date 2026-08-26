package com.ooro.screenplayer.data

import android.content.Context
import android.os.Build
import com.ooro.screenplayer.model.DeviceCredentials
import java.util.UUID
import android.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec
import java.security.KeyStore

class DeviceStore(context: Context) {
    private val prefs = context.getSharedPreferences("ooro_device", Context.MODE_PRIVATE)
    private val cipher = CredentialCipher()
    val deviceId: String get() = prefs.getString("device_id", null) ?: "ooro-${UUID.randomUUID()}".also { prefs.edit().putString("device_id", it).apply() }
    fun credentials(): DeviceCredentials? = prefs.getString("token", null)?.let { encrypted -> runCatching { DeviceCredentials(prefs.getString("device_id", deviceId)!!, prefs.getString("screen_id", "")!!, prefs.getString("workspace_id", "")!!, cipher.decrypt(encrypted), prefs.getString("device_name", "OORO Screen")!!) }.getOrNull() }
    fun save(credentials: DeviceCredentials) { prefs.edit().putString("device_id", credentials.deviceId).putString("screen_id", credentials.screenId).putString("workspace_id", credentials.workspaceId).putString("token", cipher.encrypt(credentials.token)).putString("device_name", credentials.name).apply() }
    fun clear() { prefs.edit().remove("screen_id").remove("workspace_id").remove("token").remove("device_name").apply() }
    fun deviceInfo() = mapOf("deviceId" to deviceId, "manufacturer" to Build.MANUFACTURER, "model" to Build.MODEL, "androidVersion" to Build.VERSION.RELEASE)
}

private class CredentialCipher {
    private val alias = "ooro-device-token"
    private val key get() = (KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.getKey(alias, null) ?: KeyGenerator.getInstance("AES", "AndroidKeyStore").apply { init(android.security.keystore.KeyGenParameterSpec.Builder(alias, android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build()) }.generateKey())
    fun encrypt(value: String): String { val c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, key); return Base64.encodeToString(c.iv + c.doFinal(value.toByteArray()), Base64.NO_WRAP) }
    fun decrypt(value: String): String { val raw = Base64.decode(value, Base64.NO_WRAP); val c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, raw.copyOfRange(0, 12))); return String(c.doFinal(raw.copyOfRange(12, raw.size))) }
}
