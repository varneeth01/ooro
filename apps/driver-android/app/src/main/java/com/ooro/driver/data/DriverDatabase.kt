package com.ooro.driver.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "driver_state") data class DriverStateEntity(@PrimaryKey val id: String = "current", val driverId: String? = null, val phone: String? = null, val onboardingStep: String = "AUTH", val kycStatus: String = "NOT_STARTED", val driverType: String? = null)
@Entity(tableName = "vehicles") data class VehicleEntity(@PrimaryKey val id: String, val driverId: String, val type: String, val registrationNumber: String, val manufacturer: String, val model: String, val verificationStatus: String)
@Entity(tableName = "display_bindings") data class DisplayBindingEntity(@PrimaryKey val displayId: String, val vehicleId: String, val name: String, val state: String, val lastSeen: String? = null, val appVersion: String? = null, val manifestVersion: Long? = null, val networkType: String = "UNKNOWN")
@Entity(tableName = "ride_candidates") data class RideEntity(@PrimaryKey val id: String, val provider: String, val state: String, val createdAt: String, val pickupAt: String? = null, val completedAt: String? = null, val verificationScore: Int? = null, val verificationStatus: String? = null, val verifiedAdSeconds: Long = 0)
@Entity(tableName = "ride_events") data class RideEventEntity(@PrimaryKey val eventId: String, val rideId: String?, val provider: String, val type: String, val timestamp: String, val confidence: Double, val synced: Boolean = false)
@Entity(tableName = "ride_locations") data class LocationEntity(@PrimaryKey val id: String, val rideId: String, val timestamp: String, val latitude: Double, val longitude: Double, val accuracyMeters: Float, val speedMps: Float?, val bearing: Float?, val synced: Boolean = false)
@Entity(tableName = "proof_of_play") data class ProofEntity(@PrimaryKey val proofId: String, val rideId: String, val payload: String, val synced: Boolean = false)
@Entity(tableName = "earning_entries") data class LedgerEntity(@PrimaryKey val id: String, val driverId: String, val rideId: String?, val type: String, val amountMinor: Long, val currency: String, val status: String, val createdAt: String)

@Dao interface DriverStateDao { @Query("SELECT * FROM driver_state WHERE id = 'current'") suspend fun current(): DriverStateEntity?; @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun save(state: DriverStateEntity) }
@Dao interface RideDao { @Query("SELECT * FROM ride_candidates ORDER BY createdAt DESC") suspend fun all(): List<RideEntity>; @Query("SELECT * FROM ride_candidates WHERE id = :id") suspend fun get(id: String): RideEntity?; @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun save(ride: RideEntity); @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun addEvent(event: RideEventEntity); @Query("SELECT * FROM ride_events WHERE synced = 0 LIMIT :limit") suspend fun pendingEvents(limit: Int): List<RideEventEntity> }
@Dao interface LocationDao { @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun add(sample: LocationEntity); @Query("SELECT * FROM ride_locations WHERE synced = 0 LIMIT :limit") suspend fun pending(limit: Int): List<LocationEntity> }
@Dao interface ProofDao { @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun add(proof: ProofEntity); @Query("SELECT * FROM proof_of_play WHERE synced = 0 LIMIT :limit") suspend fun pending(limit: Int): List<ProofEntity> }
@Dao interface LedgerDao { @Query("SELECT * FROM earning_entries WHERE driverId = :driverId ORDER BY createdAt DESC") suspend fun entries(driverId: String): List<LedgerEntity>; @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun add(entry: LedgerEntity) }

@Database(entities = [DriverStateEntity::class, VehicleEntity::class, DisplayBindingEntity::class, RideEntity::class, RideEventEntity::class, LocationEntity::class, ProofEntity::class, LedgerEntity::class], version = 1, exportSchema = false)
abstract class DriverDatabase : RoomDatabase() { abstract fun driverState(): DriverStateDao; abstract fun rides(): RideDao; abstract fun locations(): LocationDao; abstract fun proofs(): ProofDao; abstract fun ledger(): LedgerDao
    companion object { @Volatile private var instance: DriverDatabase? = null; fun get(context: Context) = instance ?: synchronized(this) { instance ?: Room.databaseBuilder(context, DriverDatabase::class.java, "ooro-driver.db").build().also { instance = it } } }
}
