import aiosqlite
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "claude_logger.db"):
        self.db_path = db_path
        
    async def init_db(self):
        """Initialize database tables"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_key TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen TIMESTAMP
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS device_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_key TEXT NOT NULL,
                    hostname TEXT NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    total_tokens INTEGER,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    cache_creation_tokens INTEGER,
                    cache_read_tokens INTEGER,
                    sessions_total INTEGER,
                    sessions_active INTEGER,
                    cost_opus REAL,
                    cost_sonnet REAL,
                    cost_haiku REAL,
                    cost_actual REAL,
                    hourly_usage TEXT,
                    FOREIGN KEY (user_key) REFERENCES users(user_key),
                    UNIQUE(user_key, hostname, timestamp)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_hostname 
                ON device_stats(user_key, hostname)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON device_stats(timestamp)
            """)
            
            await db.commit()
            logger.info("Database initialized")
    
    async def update_user(self, user_key: str):
        """Update or create user"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO users (user_key, last_seen) 
                VALUES (?, ?)
                ON CONFLICT(user_key) DO UPDATE SET last_seen = ?
            """, (user_key, datetime.utcnow(), datetime.utcnow()))
            await db.commit()
    
    async def save_device_stats(self, data: Dict):
        """Save device statistics"""
        async with aiosqlite.connect(self.db_path) as db:
            await self.update_user(data['userKey'])
            
            hourly_usage_json = json.dumps(data.get('hourlyUsage', []))
            
            await db.execute("""
                INSERT OR REPLACE INTO device_stats (
                    user_key, hostname, timestamp,
                    total_tokens, input_tokens, output_tokens,
                    cache_creation_tokens, cache_read_tokens,
                    sessions_total, sessions_active,
                    cost_opus, cost_sonnet, cost_haiku, cost_actual,
                    hourly_usage
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data['userKey'],
                data['hostname'],
                data['timestamp'],
                data['usage']['totalTokens'],
                data['usage']['inputTokens'],
                data['usage']['outputTokens'],
                data['usage']['cacheCreationTokens'],
                data['usage']['cacheReadTokens'],
                data['sessions']['total'],
                data['sessions']['active'],
                data['costs']['opus'],
                data['costs']['sonnet'],
                data['costs']['haiku'],
                data['costs'].get('actual', 0),
                hourly_usage_json
            ))
            
            await db.commit()
            logger.info(f"Saved stats for {data['hostname']} ({data['userKey'][:8]}...)")
    
    async def get_user_stats(self, user_key: str) -> Dict:
        """Get aggregated stats for a user across all devices"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Get latest stats for each device
            cursor = await db.execute("""
                SELECT 
                    hostname,
                    MAX(timestamp) as latest_timestamp,
                    total_tokens,
                    cost_opus,
                    cost_sonnet,
                    cost_haiku,
                    cost_actual
                FROM device_stats
                WHERE user_key = ?
                GROUP BY hostname
                ORDER BY total_tokens DESC
            """, (user_key,))
            
            devices = []
            total_tokens = 0
            total_cost = 0
            
            async for row in cursor:
                device_data = dict(row)
                devices.append({
                    'hostname': device_data['hostname'],
                    'lastSeen': device_data['latest_timestamp'],
                    'totalTokens': device_data['total_tokens'] or 0
                })
                total_tokens += device_data['total_tokens'] or 0
                total_cost += device_data['cost_actual'] or device_data['cost_opus'] or 0
            
            return {
                'devices': devices,
                'totalTokens': total_tokens,
                'totalCost': total_cost
            }
    
    async def get_devices(self, user_key: str) -> List[Dict]:
        """Get list of devices for a user"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT DISTINCT hostname, MAX(timestamp) as last_seen
                FROM device_stats
                WHERE user_key = ?
                GROUP BY hostname
                ORDER BY last_seen DESC
            """, (user_key,))
            
            devices = []
            async for row in cursor:
                devices.append(dict(row))
            
            return devices
    
    async def cleanup_old_data(self, days: int = 90):
        """Remove data older than specified days"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        async with aiosqlite.connect(self.db_path) as db:
            result = await db.execute("""
                DELETE FROM device_stats
                WHERE timestamp < ?
            """, (cutoff,))
            
            deleted = result.rowcount
            await db.commit()
            
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} old records")
    
    async def validate_user_key(self, user_key: str) -> bool:
        """Check if user key exists"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT 1 FROM users WHERE user_key = ?
            """, (user_key,))
            
            result = await cursor.fetchone()
            return result is not None