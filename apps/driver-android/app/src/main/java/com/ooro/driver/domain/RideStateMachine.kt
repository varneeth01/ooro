package com.ooro.driver.domain

class InvalidRideTransition(message: String) : IllegalStateException(message)

class RideStateMachine {
    fun reduce(current: RideState, event: RideEventType): RideState = when (event) {
        RideEventType.RIDE_REQUESTED -> if (current == RideState.IDLE) RideState.IDLE else current
        RideEventType.RIDE_ACCEPTED -> if (current == RideState.IDLE || current == RideState.RIDE_ACCEPTED) RideState.RIDE_ACCEPTED else invalid(current, event)
        RideEventType.DRIVER_TO_PICKUP -> if (current == RideState.RIDE_ACCEPTED || current == RideState.TO_PICKUP) RideState.TO_PICKUP else invalid(current, event)
        RideEventType.ARRIVED_PICKUP -> if (current == RideState.TO_PICKUP) RideState.PICKUP_DETECTED else invalid(current, event)
        RideEventType.PICKUP_DETECTED, RideEventType.PASSENGER_PICKED_UP -> if (current == RideState.TO_PICKUP || current == RideState.PICKUP_DETECTED) RideState.VERIFYING else invalid(current, event)
        RideEventType.RIDE_ACTIVE -> if (current == RideState.VERIFYING) RideState.ACTIVE_VERIFIED else invalid(current, event)
        RideEventType.RIDE_CANCELLED -> if (current in setOf(RideState.RIDE_ACCEPTED, RideState.TO_PICKUP, RideState.PICKUP_DETECTED, RideState.VERIFYING, RideState.ACTIVE_VERIFIED)) RideState.CANCELLED else invalid(current, event)
        RideEventType.RIDE_COMPLETED -> if (current == RideState.ACTIVE_VERIFIED || current == RideState.ARRIVING) RideState.COMPLETED else invalid(current, event)
        RideEventType.UNKNOWN -> current
    }
    private fun invalid(current: RideState, event: RideEventType): Nothing = throw InvalidRideTransition("Cannot apply $event from $current")
}
