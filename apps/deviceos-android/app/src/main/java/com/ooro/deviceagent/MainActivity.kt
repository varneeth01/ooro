package com.ooro.deviceagent

import android.app.Activity
import android.os.Bundle
import android.view.ViewGroup
import android.widget.*
import com.ooro.deviceagent.data.SecureStore
import com.ooro.deviceagent.network.DeviceOsApi
import com.ooro.deviceagent.sync.WorkScheduler
import com.ooro.deviceagent.sync.capabilities

class MainActivity : Activity() {
    override fun onCreate(state: Bundle?) { super.onCreate(state); val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 48, 48, 48) }; val title = TextView(this).apply { text = "OORO DeviceOS\nNon-owner observation mode"; textSize = 22f }; val status = TextView(this).apply { textSize = 14f }; val code = EditText(this).apply { hint = "Existing OORO pairing code"; inputType = 1 }; val button = Button(this).apply { text = "Enroll agent" }; val rotate = Button(this).apply { text = "Rotate stored credential"; isEnabled = false }; root.addView(title); root.addView(status, ViewGroup.LayoutParams(-1, -2)); root.addView(code, ViewGroup.LayoutParams(-1, -2)); root.addView(button, ViewGroup.LayoutParams(-1, -2)); root.addView(rotate, ViewGroup.LayoutParams(-1, -2)); setContentView(root); val store = SecureStore(this); val current = store.credentials(); status.text = if (current == null) "Not enrolled. Device Owner is not required for observation mode." else "Enrolled for display ${current.displayId}. Device Owner: ${getSystemService(android.app.admin.DevicePolicyManager::class.java).isDeviceOwnerApp(packageName)}"; rotate.isEnabled = current != null; button.setOnClickListener { val pairingCode = code.text.toString().trim(); button.isEnabled = false; Thread { try { val credentials = DeviceOsApi().enroll(pairingCode, capabilities(this)); store.save(credentials); runOnUiThread { status.text = "Enrolled. Sync scheduled."; button.isEnabled = true; rotate.isEnabled = true; WorkScheduler.enqueue(this) } } catch (error: Throwable) { runOnUiThread { status.text = "Enrollment failed: ${error.message}"; button.isEnabled = true } } }.start() }; rotate.setOnClickListener { val credentials = store.credentials() ?: return@setOnClickListener; rotate.isEnabled = false; Thread { try { val rotated = DeviceOsApi().rotateCredential(credentials); store.save(rotated); runOnUiThread { status.text = "Credential rotated. Sync scheduled."; rotate.isEnabled = true; WorkScheduler.enqueue(this) } } catch (error: Throwable) { runOnUiThread { status.text = "Credential rotation failed: ${error.message}"; rotate.isEnabled = true } } }.start() } }
}
