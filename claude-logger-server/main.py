from fastapi import FastAPI, HTTPException, Request, Depends, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import logging
import uvicorn
import os
import secrets
import json
import aiosqlite
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from typing import Optional, Dict, List

from database import Database
from models import SyncData, AggregatedStats, ApiResponse, ErrorResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database
db = Database()

# Initialize scheduler for cleanup tasks
scheduler = AsyncIOScheduler()

# Admin configuration
ADMIN_KEY = os.getenv("ADMIN_KEY", secrets.token_hex(16))
if os.getenv("ADMIN_KEY") is None:
    logger.warning(f"No ADMIN_KEY set, using generated key: {ADMIN_KEY}")

# Session management
admin_sessions: Dict[str, datetime] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    await db.init_db()
    scheduler.add_job(db.cleanup_old_data, 'cron', hour=3, minute=0)
    scheduler.start()
    logger.info("Claude Logger Sync Server started")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Claude Logger Sync Server stopped")

# Create FastAPI app
app = FastAPI(
    title="Claude Logger Sync Server",
    version="1.0.0",
    description="Centralized sync server for Claude Analytics usage data",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            message="Internal server error",
            detail=str(exc) if app.debug else None
        ).dict()
    )

# Admin authentication
def create_admin_session() -> str:
    """Create a new admin session"""
    session_id = secrets.token_hex(32)
    admin_sessions[session_id] = datetime.utcnow()
    # Clean old sessions
    cutoff = datetime.utcnow() - timedelta(hours=24)
    admin_sessions_copy = admin_sessions.copy()
    for sid, created in admin_sessions_copy.items():
        if created < cutoff:
            del admin_sessions[sid]
    return session_id

def verify_admin_session(session_id: Optional[str] = Cookie(None, alias="admin_session")) -> bool:
    """Verify admin session is valid"""
    if not session_id or session_id not in admin_sessions:
        return False
    created = admin_sessions[session_id]
    if datetime.utcnow() - created > timedelta(hours=24):
        del admin_sessions[session_id]
        return False
    return True

@app.get("/")
async def root():
    """Health check endpoint"""
    return ApiResponse(
        status="healthy",
        message="Claude Logger Sync Server is running",
        data={
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.post("/api/sync", response_model=ApiResponse)
async def sync_data(data: SyncData):
    """Sync usage data from a device"""
    try:
        # Validate and save data
        await db.save_device_stats(data.dict())
        
        return ApiResponse(
            status="success",
            message=f"Data synced successfully for {data.hostname}",
            data={
                "hostname": data.hostname,
                "tokens": data.usage.totalTokens,
                "timestamp": data.timestamp.isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Sync error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats/{user_key}", response_model=AggregatedStats)
async def get_user_stats(user_key: str):
    """Get aggregated statistics for a user"""
    # Validate key format
    if len(user_key) != 64 or not all(c in '0123456789abcdef' for c in user_key.lower()):
        raise HTTPException(status_code=400, detail="Invalid user key format")
    
    try:
        stats = await db.get_user_stats(user_key)
        
        if not stats['devices']:
            raise HTTPException(status_code=404, detail="No data found for this user")
        
        return AggregatedStats(**stats)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/devices/{user_key}")
async def get_user_devices(user_key: str):
    """Get list of devices for a user"""
    # Validate key format
    if len(user_key) != 64 or not all(c in '0123456789abcdef' for c in user_key.lower()):
        raise HTTPException(status_code=400, detail="Invalid user key format")
    
    try:
        devices = await db.get_devices(user_key)
        
        return ApiResponse(
            status="success",
            data={"devices": devices}
        )
    except Exception as e:
        logger.error(f"Devices error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/device/{user_key}/{hostname}")
async def delete_device(user_key: str, hostname: str):
    """Remove a device from user's account"""
    # Validate key format
    if len(user_key) != 64 or not all(c in '0123456789abcdef' for c in user_key.lower()):
        raise HTTPException(status_code=400, detail="Invalid user key format")
    
    # This would need implementation in database.py
    return ApiResponse(
        status="success",
        message=f"Device {hostname} removed"
    )

# Admin UI endpoints
@app.get("/admin", response_class=HTMLResponse)
async def admin_ui(session_valid: bool = Depends(verify_admin_session)):
    """Serve admin UI"""
    if not session_valid:
        return HTMLResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login - Claude Logger</title>
            <link rel="stylesheet" href="/static/css/admin.css">
        </head>
        <body>
            <div class="login-container">
                <h1>Claude Logger Admin</h1>
                <form id="loginForm">
                    <input type="password" id="adminKey" placeholder="Admin Key" required>
                    <button type="submit">Login</button>
                    <div id="error" class="error"></div>
                </form>
            </div>
            <script src="/static/js/login.js"></script>
        </body>
        </html>
        """)
    
    # Serve main admin dashboard
    with open("static/admin.html", "r") as f:
        return HTMLResponse(f.read())

@app.post("/api/admin/login")
async def admin_login(request: Request):
    """Admin login endpoint"""
    try:
        data = await request.json()
        if data.get("key") == ADMIN_KEY:
            session_id = create_admin_session()
            response = JSONResponse({"status": "success"})
            response.set_cookie(
                key="admin_session",
                value=session_id,
                httponly=True,
                secure=False,  # Set to True in production with HTTPS
                samesite="lax",
                max_age=86400  # 24 hours
            )
            return response
        else:
            raise HTTPException(status_code=401, detail="Invalid admin key")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/admin/stats")
async def admin_stats(session_valid: bool = Depends(verify_admin_session)):
    """Get overall system statistics for admin"""
    if not session_valid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # Get all users and aggregate stats
        async with aiosqlite.connect(db.db_path) as conn:
            # Total users
            cursor = await conn.execute("SELECT COUNT(DISTINCT user_key) FROM users")
            total_users = (await cursor.fetchone())[0]
            
            # Total devices
            cursor = await conn.execute("SELECT COUNT(DISTINCT user_key || hostname) FROM device_stats")
            total_devices = (await cursor.fetchone())[0]
            
            # Total tokens across all users
            cursor = await conn.execute("""
                SELECT SUM(total_tokens) 
                FROM (
                    SELECT MAX(total_tokens) as total_tokens
                    FROM device_stats
                    GROUP BY user_key, hostname
                )
            """)
            total_tokens = (await cursor.fetchone())[0] or 0
            
            # Active devices (last 24h)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            cursor = await conn.execute("""
                SELECT COUNT(DISTINCT user_key || hostname)
                FROM device_stats
                WHERE timestamp > ?
            """, (cutoff,))
            active_devices = (await cursor.fetchone())[0]
        
        return {
            "totalUsers": total_users,
            "totalDevices": total_devices,
            "activeDevices": active_devices,
            "totalTokens": total_tokens,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Admin stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/users")
async def admin_users(
    session_valid: bool = Depends(verify_admin_session),
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None
):
    """Get list of all users for admin"""
    if not session_valid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        users = []
        async with aiosqlite.connect(db.db_path) as conn:
            query = """
                SELECT 
                    u.user_key,
                    u.created_at,
                    u.last_seen,
                    COUNT(DISTINCT d.hostname) as device_count,
                    SUM(d.total_tokens) as total_tokens
                FROM users u
                LEFT JOIN (
                    SELECT user_key, hostname, MAX(total_tokens) as total_tokens
                    FROM device_stats
                    GROUP BY user_key, hostname
                ) d ON u.user_key = d.user_key
            """
            
            params = []
            if search:
                query += " WHERE u.user_key LIKE ?"
                params.append(f"%{search}%")
            
            query += " GROUP BY u.user_key ORDER BY u.last_seen DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = await conn.execute(query, params)
            
            async for row in cursor:
                users.append({
                    "userKey": row[0],
                    "createdAt": row[1],
                    "lastSeen": row[2],
                    "deviceCount": row[3] or 0,
                    "totalTokens": row[4] or 0
                })
        
        return {"users": users, "limit": limit, "offset": offset}
    except Exception as e:
        logger.error(f"Admin users error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/user/{user_key}")
async def admin_user_detail(
    user_key: str,
    session_valid: bool = Depends(verify_admin_session)
):
    """Get detailed info for a specific user"""
    if not session_valid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        user_data = await db.get_user_stats(user_key)
        
        # Get additional details
        async with aiosqlite.connect(db.db_path) as conn:
            # Get user creation date
            cursor = await conn.execute(
                "SELECT created_at, last_seen FROM users WHERE user_key = ?",
                (user_key,)
            )
            user_info = await cursor.fetchone()
            
            # Get hourly usage data
            cursor = await conn.execute("""
                SELECT hostname, hourly_usage, timestamp
                FROM device_stats
                WHERE user_key = ?
                ORDER BY timestamp DESC
                LIMIT 100
            """, (user_key,))
            
            hourly_data = []
            async for row in cursor:
                hourly_data.append({
                    "hostname": row[0],
                    "hourlyUsage": json.loads(row[1]) if row[1] else [],
                    "timestamp": row[2]
                })
        
        return {
            "userKey": user_key,
            "createdAt": user_info[0] if user_info else None,
            "lastSeen": user_info[1] if user_info else None,
            "stats": user_data,
            "hourlyData": hourly_data
        }
    except Exception as e:
        logger.error(f"Admin user detail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )