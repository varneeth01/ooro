package com.ooro.deviceagent.data

import android.content.Context
import android.util.Base64
import com.ooro.deviceagent.model.DeviceCredentials
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

class SecureStore(context: Context) {
    private val prefs = context.getSharedPreferences("deviceos_secure", Context.MODE_PRIVATE)
    private val alias = "ooro-deviceos-credentials"
    fun credentials(): DeviceCredentials? = prefs.getString("credentials", null)?.let { runCatching { JSONObject(decrypt(it)).let { json -> DeviceCredentials(json.getString("managedDeviceId"), json.getString("displayId"), json.getString("credentialId"), json.getString("token")) } }.getOrNull() }
    fun save(value: DeviceCredentials) { val json = JSONObject().put("managedDeviceId", value.managedDeviceId).put("displayId", value.displayId).put("credentialId", value.credentialId).put("token", value.token); check(prefs.edit().putString("credentials", encrypt(json.toString())).commit()) }
    fun clear() { prefs.edit().remove("credentials").apply() }
    private fun key() = (KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.getKey(alias, null) ?: KeyGenerator.getInstance("AES", "AndroidKeyStore").apply { init(android.security.keystore.KeyGenParameterSpec.Builder(alias, android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build()) }.generateKey())
    private fun encrypt(value: String): String { val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key()); return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray()), Base64.NO_WRAP) }
    private fun decrypt(value: String): String { val raw = Base64.decode(value, Base64.NO_WRAP); val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, raw.copyOfRange(0, 12))); return String(cipher.doFinal(raw.copyOfRange(12, raw.size))) }
}
