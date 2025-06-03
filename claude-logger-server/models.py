from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class UsageData(BaseModel):
    totalTokens: int = Field(ge=0)
    inputTokens: int = Field(ge=0)
    outputTokens: int = Field(ge=0)
    cacheCreationTokens: int = Field(ge=0)
    cacheReadTokens: int = Field(ge=0)

class SessionData(BaseModel):
    total: int = Field(ge=0)
    active: int = Field(ge=0)
    averageDuration: float = Field(ge=0)

class CostData(BaseModel):
    opus: float = Field(ge=0)
    sonnet: float = Field(ge=0)
    haiku: float = Field(ge=0)
    actual: Optional[float] = Field(default=0, ge=0)

class SyncData(BaseModel):
    userKey: str = Field(min_length=64, max_length=64, pattern="^[a-f0-9]+$")
    hostname: str = Field(min_length=1, max_length=255)
    timestamp: datetime
    usage: UsageData
    sessions: SessionData
    costs: CostData
    hourlyUsage: List[int] = Field(min_items=24, max_items=24)
    version: str

class DeviceInfo(BaseModel):
    hostname: str
    lastSeen: datetime
    totalTokens: int

class AggregatedStats(BaseModel):
    devices: List[DeviceInfo]
    totalTokens: int
    totalCost: float

class ApiResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Dict] = None

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    detail: Optional[str] = None