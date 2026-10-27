package com.ooro.driver

import android.content.Context
import android.net.Uri
import android.content.ContentResolver
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ooro.driver.data.*
import com.ooro.driver.domain.*
import com.ooro.driver.network.*
import com.ooro.driver.notifications.NormalizedRideEventBus
import com.ooro.driver.duty.DutySessionManager
import com.ooro.driver.documents.DocumentImageProcessor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

enum class AppMode { LOGIN, OTP, ONBOARDING, FLEET_INQUIRY, DASHBOARD }
enum class DriverRoute { AUTH, FLEET_INQUIRY, REGISTRATION, REVIEW_STATUS, DISPLAY_SETUP, DASHBOARD }
enum class OnboardingStep { DRIVER_TYPE, PROFILE, KYC, VEHICLE, DISPLAY_OWNERSHIP, PAIR_DISPLAY, PERMISSIONS, PAYMENT, TERMS, APPLICATION_STATUS, COMPLETE }
data class DashboardState(val todayMinor: Long = 0, val verifiedRides: Int = 0, val advertisingSeconds: Long = 0, val display: DisplayBinding? = null, val activeRide: RideCandidate? = null, val dutySession: DutySessionSummary? = null, val activation: ActivationEligibility? = null, val snapshot: DriverDashboardSnapshot? = null, val onboarding: OnboardingStatusSnapshot? = null, val loading: Boolean = false, val error: String? = null, val uploadProgress: Int? = null, val uploadError: String? = null, val supportSubmitting: Boolean = false)

class DriverAppViewModel(private val database: DriverDatabase, private val sessionStore: SecureSessionStore, private val api: DriverApi, private val context: Context) : ViewModel() {
    private val _mode = MutableStateFlow(if (sessionStore.get() == null) AppMode.LOGIN else AppMode.ONBOARDING); val mode: StateFlow<AppMode> = _mode
    private val _step = MutableStateFlow(OnboardingStep.DRIVER_TYPE); val step: StateFlow<OnboardingStep> = _step
    private val _message = MutableStateFlow<String?>(null); val message: StateFlow<String?> = _message
    private val _authLoading = MutableStateFlow(false); val authLoading: StateFlow<Boolean> = _authLoading
    private val _savedPhone = MutableStateFlow(""); val savedPhone: StateFlow<String> = _savedPhone
    private val _profile = MutableStateFlow<DriverProfile?>(null); val profile: StateFlow<DriverProfile?> = _profile
    private val _dashboard = MutableStateFlow(DashboardState()); val dashboard: StateFlow<DashboardState> = _dashboard
    private val _agreements = MutableStateFlow<List<AgreementSummary>>(emptyList()); val agreements: StateFlow<List<AgreementSummary>> = _agreements
    private var phone = ""
    private var uploadJob: Job? = null
    private val eventListener: (NormalizedRideEvent) -> Unit = { if (it.provider != "SYSTEM" && _dashboard.value.dutySession != null) handleRideEvent(it) }
    init { NormalizedRideEventBus.subscribe(eventListener); viewModelScope.launch { database.driverState().current()?.let { saved -> phone = saved.phone.orEmpty(); _savedPhone.value = phone; val restored = runCatching { OnboardingStep.valueOf(saved.onboardingStep) }.getOrDefault(OnboardingStep.DRIVER_TYPE); _step.value = restored; if (sessionStore.get() == null) _mode.value = AppMode.LOGIN }; if (sessionStore.get() != null) { runCatching { _dashboard.value = _dashboard.value.copy(dutySession = api.currentDuty()) }; refreshDashboard() } } }
    fun requestOtp(phoneNumber: String) { phone = phoneNumber; _savedPhone.value = phoneNumber; _mode.value = AppMode.OTP; viewModelScope.launch { _authLoading.value = true; runCatching { api.requestOtp(phoneNumber) }.onSuccess { runCatching { database.driverState().save(DriverStateEntity(phone = phoneNumber, onboardingStep = _step.value.name)) } }.onFailure { _mode.value = AppMode.LOGIN; _message.value = it.message ?: "Unable to request OTP" }; _authLoading.value = false } }
    fun verifyOtp(otp: String) { viewModelScope.launch { _authLoading.value = true; runCatching { api.verifyOtp(phone, otp) }.onSuccess { response -> sessionStore.save(Session(response.accessToken, response.refreshToken, response.driverId)); _profile.value = response.profile; val saved = runCatching { database.driverState().current() }.getOrNull(); val restored = runCatching { OnboardingStep.valueOf(saved?.onboardingStep ?: OnboardingStep.DRIVER_TYPE.name) }.getOrDefault(OnboardingStep.DRIVER_TYPE); _step.value = restored; _mode.value = if (restored == OnboardingStep.COMPLETE) AppMode.DASHBOARD else AppMode.ONBOARDING; runCatching { database.driverState().save(DriverStateEntity(driverId = response.driverId, phone = phone, onboardingStep = restored.name)) }; refreshDashboard() }.onFailure { _message.value = it.message ?: "Unable to verify OTP" }; _authLoading.value = false } }
    fun chooseDriverType(type: DriverType) { if (type == DriverType.FLEET_OWNER) _mode.value = AppMode.FLEET_INQUIRY else advance(OnboardingStep.PROFILE) }
    fun advance(next: OnboardingStep) { _step.value = next; viewModelScope.launch { database.driverState().save(DriverStateEntity(driverId = sessionStore.get()?.driverId, phone = phone, onboardingStep = next.name, driverType = "INDIVIDUAL")) } }
    fun pairDisplay(code: String, vehicleId: String? = null) { viewModelScope.launch { val driverId = sessionStore.get()?.driverId ?: return@launch; _dashboard.value = _dashboard.value.copy(loading = true, error = null); runCatching { api.pairDisplay(code, driverId, resolveAssignedVehicleId(vehicleId, api.assignedVehicleId())) }.onSuccess { binding -> database.driverState().save(DriverStateEntity(driverId = driverId, phone = phone, onboardingStep = OnboardingStep.PERMISSIONS.name, driverType = "INDIVIDUAL")); _dashboard.value = _dashboard.value.copy(display = binding, loading = false); _step.value = OnboardingStep.PERMISSIONS }.onFailure { _dashboard.value = _dashboard.value.copy(loading = false); _message.value = it.message ?: "Display pairing failed" } } }
    fun completeOnboarding() { reconcileApproval() }
    fun reconcileApproval() { viewModelScope.launch { _dashboard.value = _dashboard.value.copy(loading = true, error = null); runCatching { val status = api.onboardingStatus(); val dashboard = if (isServerApprovedDriver(status.onboardingStatus, status.accountStatus)) api.dashboard() else null; status to dashboard }.onSuccess { (status, dashboard) -> _dashboard.value = _dashboard.value.copy(onboarding = status, snapshot = dashboard, loading = false); when (resolveDriverRoute(sessionStore.get() != null, status.onboardingStatus, status.accountStatus, dashboard?.displayLabel)) { DriverRoute.DISPLAY_SETUP -> { _step.value = OnboardingStep.DISPLAY_OWNERSHIP; _mode.value = AppMode.ONBOARDING }; DriverRoute.DASHBOARD -> { database.driverState().save(DriverStateEntity(driverId = sessionStore.get()?.driverId, phone = phone, onboardingStep = OnboardingStep.COMPLETE.name, driverType = "INDIVIDUAL")); _step.value = OnboardingStep.COMPLETE; _mode.value = AppMode.DASHBOARD }; else -> { _step.value = OnboardingStep.APPLICATION_STATUS; _mode.value = AppMode.ONBOARDING } } }.onFailure { _dashboard.value = _dashboard.value.copy(loading = false, error = it.message ?: "Approval status is temporarily unavailable"); _message.value = _dashboard.value.error } } }
    fun refreshActivation() { viewModelScope.launch { runCatching { api.activationEligibility() }.onSuccess { _dashboard.value = _dashboard.value.copy(activation = it) } } }
    fun refreshDashboard() { viewModelScope.launch { _dashboard.value = _dashboard.value.copy(loading = true, error = null); runCatching { api.dashboard() }.onSuccess { snapshot -> _dashboard.value = _dashboard.value.copy(snapshot = snapshot, dutySession = snapshot.duty, loading = false, error = null); if (sessionStore.get() != null) { when (resolveDriverRoute(true, snapshot.onboardingStatus, snapshot.accountStatus, snapshot.displayLabel)) { DriverRoute.REGISTRATION -> { _mode.value = AppMode.ONBOARDING }; DriverRoute.REVIEW_STATUS -> { _step.value = OnboardingStep.APPLICATION_STATUS; _mode.value = AppMode.ONBOARDING }; DriverRoute.DISPLAY_SETUP -> { _step.value = OnboardingStep.DISPLAY_OWNERSHIP; _mode.value = AppMode.ONBOARDING }; DriverRoute.DASHBOARD -> { _step.value = OnboardingStep.COMPLETE; _mode.value = AppMode.DASHBOARD }; else -> Unit } } }.onFailure { _dashboard.value = _dashboard.value.copy(loading = false, error = it.message ?: "Dashboard is temporarily unavailable") } } }
    fun refreshOnboardingStatus() { viewModelScope.launch { runCatching { api.onboardingStatus() }.onSuccess { _dashboard.value = _dashboard.value.copy(onboarding = it) }.onFailure { _message.value = it.message ?: "Application status is temporarily unavailable" } } }
    fun setPermission(permission: String, granted: Boolean) { viewModelScope.launch { runCatching { api.setPermission(permission, granted) }.onFailure { _message.value = it.message ?: "Permission status could not be saved" } } }
    fun setMobilityProvider(provider: String, enabled: Boolean) { viewModelScope.launch { runCatching { api.setMobilityProvider(provider, enabled) }.onFailure { _message.value = it.message ?: "Provider status could not be saved" } } }
    fun refreshAgreements() { viewModelScope.launch { runCatching { api.requiredAgreements() }.onSuccess { _agreements.value = it }.onFailure { _message.value = "Unable to load current agreement versions" } } }
    fun acceptAgreement(versionId: String) { viewModelScope.launch { runCatching { api.acceptAgreement(versionId) }.onSuccess { accepted -> _agreements.value = _agreements.value.map { if (it.id == versionId) it.copy(accepted = accepted.accepted, contentHash = accepted.contentHash ?: it.contentHash) else it }; _message.value = "Agreement acceptance recorded" }.onFailure { _message.value = it.message ?: "Agreement acceptance failed" } } }
    fun submitOnboarding() { viewModelScope.launch { runCatching { api.submitOnboarding() }.onSuccess { database.driverState().save(DriverStateEntity(driverId = sessionStore.get()?.driverId, phone = phone, onboardingStep = OnboardingStep.APPLICATION_STATUS.name, driverType = "INDIVIDUAL")); _step.value = OnboardingStep.APPLICATION_STATUS; _message.value = "Application submitted for review" }.onFailure { _message.value = it.message ?: "Application could not be submitted" } } }
    fun saveBeneficiary(type: String, value: String) { viewModelScope.launch { runCatching { api.createBeneficiary(type, value.trim()) }.onSuccess { advance(OnboardingStep.TERMS); _message.value = "Beneficiary submitted for verification" }.onFailure { _message.value = it.message ?: "Bank details could not be saved" } } }
    fun saveVehicle(type: String, registrationNumber: String, manufacturer: String, model: String) { viewModelScope.launch { runCatching { api.createVehicle(type, registrationNumber.trim(), manufacturer.trim(), model.trim()) }.onSuccess { advance(OnboardingStep.PAYMENT) }.onFailure { _message.value = it.message ?: "Vehicle could not be saved" } } }
    fun saveProfile(name: String, email: String, city: String, language: String) { viewModelScope.launch { runCatching { api.updateProfile(name.trim(), email.trim().ifBlank { null }, city.trim(), language) }.onSuccess { _profile.value = _profile.value?.copy(fullName = name.trim(), email = email.trim().ifBlank { null }, city = city.trim(), language = language); advance(OnboardingStep.KYC) }.onFailure { _message.value = it.message ?: "Profile could not be saved" } } }
    fun uploadDocument(resolver: ContentResolver, uri: Uri, documentType: String, contentType: String) { uploadDocument(resolver, uri, documentType, contentType, 0, false) }
    fun uploadDocument(resolver: ContentResolver, uri: Uri, documentType: String, contentType: String, rotationDegrees: Int, cropSquare: Boolean) { uploadJob?.cancel(); uploadJob = viewModelScope.launch { _dashboard.value = _dashboard.value.copy(uploadProgress = 5, uploadError = null); _message.value = "Uploading securely…"; runCatching { if (contentType.startsWith("image/")) DocumentImageProcessor.process(resolver, uri, rotationDegrees, cropSquare) else resolver.openInputStream(uri)?.use { it.readBytes() } ?: error("Unable to read selected document") }.mapCatching { bytes -> _dashboard.value = _dashboard.value.copy(uploadProgress = 35); api.uploadDocument(documentType, if (contentType.startsWith("image/")) "image/jpeg" else contentType, bytes) { progress -> _dashboard.value = _dashboard.value.copy(uploadProgress = progress) } }.onSuccess { _dashboard.value = _dashboard.value.copy(uploadProgress = null); _message.value = "Document submitted for review" }.onFailure { _dashboard.value = _dashboard.value.copy(uploadProgress = null, uploadError = it.message ?: "Document upload failed"); _message.value = it.message ?: "Document upload failed" } } }
    fun cancelDocumentUpload() { uploadJob?.cancel(); uploadJob = null; _dashboard.value = _dashboard.value.copy(uploadProgress = null, uploadError = "Upload cancelled"); _message.value = "Upload cancelled" }
    fun retryDocumentUpload(resolver: ContentResolver, uri: Uri, documentType: String, contentType: String) = uploadDocument(resolver, uri, documentType, contentType)
    fun retryDocumentUpload(resolver: ContentResolver, uri: Uri, documentType: String, contentType: String, rotationDegrees: Int, cropSquare: Boolean) = uploadDocument(resolver, uri, documentType, contentType, rotationDegrees, cropSquare)
    fun submitSupportTicket(category: String, description: String) { viewModelScope.launch { _dashboard.value = _dashboard.value.copy(supportSubmitting = true); runCatching { api.createSupportTicket(category, description) }.onSuccess { _dashboard.value = _dashboard.value.copy(supportSubmitting = false); _message.value = "Support request submitted" }.onFailure { _dashboard.value = _dashboard.value.copy(supportSubmitting = false); _message.value = it.message ?: "Support request could not be submitted" } } }
    fun startDuty() { viewModelScope.launch { _dashboard.value = _dashboard.value.copy(loading = true, error = null); runCatching { val eligibility = api.activationEligibility(); if (!eligibility.eligible) error(eligibility.reasons.joinToString("; ").ifBlank { "Your account is not eligible for duty yet" }); DutySessionManager(context, com.ooro.driver.network.ApiProvider(object : SecureTokenProvider { override fun token() = sessionStore.get()?.accessToken })).start() }.onSuccess { _dashboard.value = _dashboard.value.copy(dutySession = it, loading = false); _message.value = null }.onFailure { _dashboard.value = _dashboard.value.copy(loading = false); _message.value = it.message ?: "Unable to start duty" } } }
    fun endDuty() { val current = _dashboard.value.dutySession ?: return; viewModelScope.launch { _dashboard.value = _dashboard.value.copy(loading = true); runCatching { DutySessionManager(context, com.ooro.driver.network.ApiProvider(object : SecureTokenProvider { override fun token() = sessionStore.get()?.accessToken })).stop(current) }.onSuccess { _dashboard.value = _dashboard.value.copy(dutySession = null, loading = false); _message.value = null }.onFailure { _dashboard.value = _dashboard.value.copy(loading = false); _message.value = it.message ?: "Unable to end duty" } } }
    fun showOnboarding() { if (_step.value == OnboardingStep.APPLICATION_STATUS) _step.value = OnboardingStep.KYC; _mode.value = AppMode.ONBOARDING }
    fun logout() { sessionStore.clear(); _mode.value = AppMode.LOGIN }
    fun clearMessage() { _message.value = null }
    fun resetSyntheticState() {
        if (!BuildConfig.USE_MOCK_BACKEND) return
        uploadJob?.cancel()
        sessionStore.clear()
        runBlocking(Dispatchers.IO) { database.clearAllTables() }
        _mode.value = AppMode.LOGIN
        _step.value = OnboardingStep.DRIVER_TYPE
        _message.value = null
        _savedPhone.value = ""
        _profile.value = null
        _agreements.value = emptyList()
        _dashboard.value = DashboardState()
        phone = ""
    }
    fun seedSyntheticOtp(phoneNumber: String) {
        if (!BuildConfig.USE_MOCK_BACKEND) return
        phone = phoneNumber
        _savedPhone.value = phoneNumber
        _mode.value = AppMode.OTP
    }
    fun seedSyntheticAuthenticatedScenario(scenario: String) {
        if (!BuildConfig.USE_MOCK_BACKEND) return
        context.getSharedPreferences("driver_mock", Context.MODE_PRIVATE).edit().putString("scenario", scenario).commit()
        sessionStore.save(Session("synthetic-access", "synthetic-refresh", "synthetic-driver"))
        phone = "9876543210"
        _savedPhone.value = phone
        _step.value = OnboardingStep.DRIVER_TYPE
        _mode.value = AppMode.ONBOARDING
        refreshDashboard()
    }
    fun simulate(event: RideEventType) { if (!BuildConfig.ALLOW_DEBUG_SIMULATION) return; handleRideEvent(NormalizedRideEvent(provider = "DEBUG", eventType = event, confidence = 1.0)) }
    private fun handleRideEvent(event: NormalizedRideEvent) { val current = _dashboard.value.activeRide; val machine = RideStateMachine(); val next = if (current == null) { RideCandidate(provider = event.provider, state = runCatching { machine.reduce(RideState.IDLE, event.eventType) }.getOrDefault(RideState.IDLE)) } else current.copy(state = runCatching { machine.reduce(current.state, event.eventType) }.getOrDefault(current.state), pickupAt = if (event.eventType == RideEventType.PASSENGER_PICKED_UP) event.timestamp else current.pickupAt, completedAt = if (event.eventType == RideEventType.RIDE_COMPLETED) event.timestamp else current.completedAt); _dashboard.value = _dashboard.value.copy(activeRide = next, display = when (next.state) { RideState.ACTIVE_VERIFIED -> _dashboard.value.display?.copy(state = DisplayState.ACTIVE_PLAYBACK); RideState.CANCELLED, RideState.COMPLETED -> _dashboard.value.display?.copy(state = DisplayState.ENDING_SESSION); else -> _dashboard.value.display }); viewModelScope.launch { database.rides().save(RideEntity(next.id, next.provider, next.state.name, next.createdAt.toString(), next.pickupAt?.toString(), next.completedAt?.toString(), next.verification?.score, next.verification?.status?.name, next.verifiedAdSeconds)); database.rides().addEvent(RideEventEntity(eventId = event.eventId, rideId = next.id, provider = event.provider, type = event.eventType.name, timestamp = event.timestamp.toString(), confidence = event.confidence, sourcePackage = event.sourcePackage, evidence = event.evidence.name, diagnosticCode = event.diagnosticCode)) } }
    override fun onCleared() { NormalizedRideEventBus.unsubscribe(eventListener); super.onCleared() }
    companion object { fun factory(context: Context) = object : ViewModelProvider.Factory { override fun <T : ViewModel> create(modelClass: Class<T>): T { val db = DriverDatabase.get(context); val store = SecureSessionStore(context); val api = if (BuildConfig.USE_MOCK_BACKEND) MockDriverApi { context.getSharedPreferences("driver_mock", Context.MODE_PRIVATE).getString("scenario", "APPROVED") ?: "APPROVED" } else HttpDriverApi(BuildConfig.API_BASE_URL) { store.get()?.accessToken }; return DriverAppViewModel(db, store, api, context) as T } } }
}
