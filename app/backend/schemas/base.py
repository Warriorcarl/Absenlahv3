from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    PEKERJA = "pekerja"

class LatenessCategory(str, Enum):
    QUOTA = "quota"
    LEAVE = "leave"
    EMERGENCY = "emergency"
    UNAPPROVED = "unapproved"

class LeaveType(str, Enum):
    ANNUAL = "annual"
    EMERGENCY = "emergency"
    SICK = "sick"

class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole
    division_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hardware_id: Optional[str] = None
    is_hardware_bound: bool = False
    first_login_done: bool = False
    created_at: datetime
    updated_at: datetime

# --- Config Schemas ---
class ConfigRule(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None

# --- Attendance Schemas ---
class AttendanceLogBase(BaseModel):
    user_id: Optional[str] = None # Filled from auth token
    check_in_time: datetime
    check_in_lat: float
    check_in_long: float
    geofence_id: Optional[str] = None
    is_manual: bool = False
    manual_reason: Optional[str] = None

class AttendanceLogCreate(AttendanceLogBase):
    manual_proof_photo_url: Optional[str] = None

class AttendanceLogUpdate(BaseModel):
    check_out_time: Optional[datetime] = None
    check_out_lat: Optional[float] = None
    check_out_long: Optional[float] = None
    arrival_at_warehouse_time: Optional[datetime] = None
    liveness_score: Optional[float] = None
    is_liveness_verified: Optional[bool] = None
    status: Optional[RequestStatus] = None

# --- Leave Schemas ---
class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    reason: str
    proof_url: Optional[str] = None

# --- Stats Schemas ---
class UserStats(BaseModel):
    user_id: str
    month: int
    year: int
    remaining_lateness_quota: int = 2
    remaining_leave_quota: int = 0
    remaining_early_departure_quota: int = 3
    remaining_emergency_quota: int = 2
    total_lateness_fines: float = 0
    total_overtime_earned: float = 0
    total_bonus_disiplin: float = 0
