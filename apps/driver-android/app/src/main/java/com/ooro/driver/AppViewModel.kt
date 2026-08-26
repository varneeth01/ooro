package com.ooro.driver

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ooro.driver.data.*
import com.ooro.driver.domain.*
import com.ooro.driver.network.*
import com.ooro.driver.notifications.NormalizedRideEventBus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

enum class AppMode { LOGIN, OTP, ONBOARDING, FLEET_INQUIRY, DASHBOARD }
enum class OnboardingStep { DRIVER_TYPE, PROFILE, KYC, VEHICLE, DISPLAY_OWNERSHIP, PAIR_DISPLAY, PERMISSIONS, PAYMENT, TERMS, COMPLETE }
data class DashboardState(val todayMinor: Long = 0, val verifiedRides: Int = 0, val advertisingSeconds: Long = 0, val display: DisplayBinding? = null, val activeRide: RideCandidate? = null)

class DriverAppViewModel(private val database: DriverDatabase, private val sessionStore: SecureSessionStore, private val api: DriverApi) : ViewModel() {
    private val _mode = MutableStateFlow(if (sessionStore.get() == null) AppMode.LOGIN else AppMode.DASHBOARD); val mode: StateFlow<AppMode> = _mode
    private val _step = MutableStateFlow(OnboardingStep.DRIVER_TYPE); val step: StateFlow<OnboardingStep> = _step
    private val _message = MutableStateFlow<String?>(null); val message: StateFlow<String?> = _message
    private val _profile = MutableStateFlow<DriverProfile?>(null); val profile: StateFlow<DriverProfile?> = _profile
    private val _dashboard = MutableStateFlow(DashboardState()); val dashboard: StateFlow<DashboardState> = _dashboard
    private var phone = ""
    private val eventListener: (NormalizedRideEvent) -> Unit = { handleRideEvent(it) }
    init { NormalizedRideEventBus.subscribe(eventListener) }
    fun requestOtp(phoneNumber: String) { phone = phoneNumber; viewModelScope.launch { runCatching { api.requestOtp(phoneNumber) }.onSuccess { _mode.value = AppMode.OTP }.onFailure { _message.value = it.message ?: "Unable to request OTP" } } }
    fun verifyOtp(otp: String) { viewModelScope.launch { runCatching { api.verifyOtp(phone, otp) }.onSuccess { response -> sessionStore.save(Session(response.accessToken, response.refreshToken, response.driverId)); _profile.value = response.profile; database.driverState().save(DriverStateEntity(driverId = response.driverId, phone = phone, onboardingStep = OnboardingStep.DRIVER_TYPE.name)); _mode.value = AppMode.ONBOARDING }.onFailure { _message.value = it.message ?: "Unable to verify OTP" } } }
    fun chooseDriverType(type: DriverType) { if (type == DriverType.FLEET_OWNER) _mode.value = AppMode.FLEET_INQUIRY else advance(OnboardingStep.PROFILE) }
    fun advance(next: OnboardingStep) { _step.value = next; viewModelScope.launch { database.driverState().save(DriverStateEntity(driverId = sessionStore.get()?.driverId, phone = phone, onboardingStep = next.name, driverType = "INDIVIDUAL")) } }
    fun pairDisplay(code: String, vehicleId: String = "vehicle-demo") { viewModelScope.launch { val driverId = sessionStore.get()?.driverId ?: return@launch; runCatching { api.pairDisplay(code, driverId, vehicleId) }.onSuccess { binding -> database.driverState().save(DriverStateEntity(driverId = driverId, phone = phone, onboardingStep = OnboardingStep.PERMISSIONS.name, kycStatus = "VERIFIED", driverType = "INDIVIDUAL")); _dashboard.value = _dashboard.value.copy(display = binding); _step.value = OnboardingStep.PERMISSIONS }.onFailure { _message.value = it.message ?: "Display pairing failed" } } }
    fun completeOnboarding() { _step.value = OnboardingStep.COMPLETE; _mode.value = AppMode.DASHBOARD; _message.value = null }
    fun showOnboarding() { _mode.value = AppMode.ONBOARDING }
    fun logout() { sessionStore.clear(); _mode.value = AppMode.LOGIN }
    fun clearMessage() { _message.value = null }
    fun simulate(event: RideEventType) { if (!BuildConfig.ALLOW_DEBUG_SIMULATION) return; handleRideEvent(NormalizedRideEvent(provider = "DEBUG", eventType = event, confidence = 1.0)) }
    private fun handleRideEvent(event: NormalizedRideEvent) { val current = _dashboard.value.activeRide; val machine = RideStateMachine(); val next = if (current == null) { RideCandidate(provider = event.provider, state = runCatching { machine.reduce(RideState.IDLE, event.eventType) }.getOrDefault(RideState.IDLE)) } else current.copy(state = runCatching { machine.reduce(current.state, event.eventType) }.getOrDefault(current.state), pickupAt = if (event.eventType == RideEventType.PASSENGER_PICKED_UP) event.timestamp else current.pickupAt, completedAt = if (event.eventType == RideEventType.RIDE_COMPLETED) event.timestamp else current.completedAt); _dashboard.value = _dashboard.value.copy(activeRide = next, display = when (next.state) { RideState.ACTIVE_VERIFIED -> _dashboard.value.display?.copy(state = DisplayState.ACTIVE_PLAYBACK); RideState.CANCELLED, RideState.COMPLETED -> _dashboard.value.display?.copy(state = DisplayState.ENDING_SESSION); else -> _dashboard.value.display }); viewModelScope.launch { database.rides().save(RideEntity(next.id, next.provider, next.state.name, next.createdAt.toString(), next.pickupAt?.toString(), next.completedAt?.toString(), next.verification?.score, next.verification?.status?.name, next.verifiedAdSeconds)); database.rides().addEvent(RideEventEntity(event.eventId, next.id, event.provider, event.eventType.name, event.timestamp.toString(), event.confidence)) } }
    override fun onCleared() { NormalizedRideEventBus.unsubscribe(eventListener); super.onCleared() }
    companion object { fun factory(context: Context) = object : ViewModelProvider.Factory { override fun <T : ViewModel> create(modelClass: Class<T>): T { val db = DriverDatabase.get(context); val store = SecureSessionStore(context); val api = if (BuildConfig.USE_MOCK_BACKEND) MockDriverApi() else HttpDriverApi(BuildConfig.API_BASE_URL) { store.get()?.accessToken }; return DriverAppViewModel(db, store, api) as T } } }
}
