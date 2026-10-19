package com.ooro.deviceagent.data

import androidx.room.*

@Entity(tableName = "install_state")
data class InstallStateEntity(@PrimaryKey val targetId: String, val state: String, val sessionId: Int? = null, val localPath: String? = null, val updatedAt: Long = System.currentTimeMillis(), val error: String? = null)

@Dao
interface InstallStateDao {
    @Query("SELECT * FROM install_state WHERE targetId = :targetId") suspend fun get(targetId: String): InstallStateEntity?
    @Query("SELECT * FROM install_state WHERE sessionId = :sessionId LIMIT 1") suspend fun bySession(sessionId: Int): InstallStateEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun put(value: InstallStateEntity)
}

@Database(entities = [InstallStateEntity::class], version = 1, exportSchema = false)
abstract class AgentDatabase : RoomDatabase() { abstract fun installStates(): InstallStateDao }

object AgentDatabaseProvider { @Volatile private var instance: AgentDatabase? = null; fun get(context: android.content.Context): AgentDatabase = instance ?: synchronized(this) { instance ?: Room.databaseBuilder(context.applicationContext, AgentDatabase::class.java, "deviceos.db").build().also { instance = it } } }
