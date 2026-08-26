package com.ooro.driver.data

import android.content.Context
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

data class Session(val accessToken: String, val refreshToken: String, val driverId: String)
class SecureSessionStore(context: Context) {
    private val preferences = context.getSharedPreferences("ooro_driver_session", Context.MODE_PRIVATE); private val cipher = KeystoreCipher()
    fun get(): Session? = preferences.getString("session", null)?.let { runCatching { val value = cipher.decrypt(it).split("|", limit = 3); Session(value[0], value[1], value[2]) }.getOrNull() }
    fun save(session: Session) { preferences.edit().putString("session", cipher.encrypt(listOf(session.accessToken, session.refreshToken, session.driverId).joinToString("|"))).apply() }
    fun clear() { preferences.edit().clear().apply() }
}
private class KeystoreCipher {
    private val alias = "ooro-driver-session"
    private val key get() = (KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.getKey(alias, null) ?: KeyGenerator.getInstance("AES", "AndroidKeyStore").apply { init(android.security.keystore.KeyGenParameterSpec.Builder(alias, android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build()) }.generateKey())
    fun encrypt(value: String): String { val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key); return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray()), Base64.NO_WRAP) }
    fun decrypt(value: String): String { val raw = Base64.decode(value, Base64.NO_WRAP); val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, raw.copyOfRange(0, 12))); return String(cipher.doFinal(raw.copyOfRange(12, raw.size))) }
}
