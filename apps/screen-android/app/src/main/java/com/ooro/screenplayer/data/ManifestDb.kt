package com.ooro.screenplayer.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "campaign_manifest") data class ManifestEntity(@PrimaryKey val id: String = "active", val version: Long, val timezone: String, val validUntil: String?, val json: String)
@Entity(tableName = "proof_of_play") data class ProofEntity(@PrimaryKey val eventId: String, val payload: String, val synced: Boolean = false, val createdAt: Long = System.currentTimeMillis())
@Entity(tableName = "app_error") data class ErrorEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val message: String, val createdAt: Long = System.currentTimeMillis())

@Dao interface ManifestDao { @Query("SELECT * FROM campaign_manifest WHERE id = 'active' LIMIT 1") suspend fun active(): ManifestEntity?; @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun put(entity: ManifestEntity) }
@Dao interface ProofDao { @Query("SELECT * FROM proof_of_play WHERE synced = 0 ORDER BY createdAt LIMIT :limit") suspend fun pending(limit: Int): List<ProofEntity>; @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun add(entity: ProofEntity); @Query("DELETE FROM proof_of_play WHERE eventId IN (:ids)") suspend fun delete(ids: List<String>); @Query("SELECT COUNT(*) FROM proof_of_play WHERE synced = 0") suspend fun pendingCount(): Int }
@Dao interface ErrorDao { @Insert suspend fun add(entity: ErrorEntity) }
@Database(entities = [ManifestEntity::class, ProofEntity::class, ErrorEntity::class], version = 1, exportSchema = false)
abstract class OoroDatabase : RoomDatabase() { abstract fun manifestDao(): ManifestDao; abstract fun proofDao(): ProofDao; abstract fun errorDao(): ErrorDao
    companion object { @Volatile private var instance: OoroDatabase? = null; fun get(context: Context) = instance ?: synchronized(this) { instance ?: Room.databaseBuilder(context, OoroDatabase::class.java, "ooro.db").build().also { instance = it } } }
}
