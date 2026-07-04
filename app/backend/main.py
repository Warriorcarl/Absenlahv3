from fastapi import FastAPI
from contextlib import asynccontextmanager
from routes import auth, attendance, supervisor, leaves, admin, uploads
from database.mongodb import user_stats_collection, attendance_logs_collection
from routes.deps import get_current_user
from datetime import datetime
from fastapi import Depends

async def enforce_2h_rule():
    # Background task logic to check for expired manual check-ins
    from datetime import datetime, timedelta
    from services.config import get_config

    now = datetime.utcnow()
    max_h = await get_config("MANUAL_CHECKIN_MAX_ARRIVAL_TIME_HOURS")
    deadline = now - timedelta(hours=max_h)

    expired_logs = await attendance_logs_collection.find({
        "is_manual": True,
        "arrival_at_warehouse_time": None,
        "check_in_time": {"$lt": deadline},
        "status": {"$ne": "rejected"}
    }).to_list(100)

    for log in expired_logs:
        await attendance_logs_collection.update_one(
            {"_id": log["_id"]},
            {"$set": {"status": "rejected", "manual_arrival_violation": True, "updated_at": now}}
        )
        await user_stats_collection.update_one(
            {"user_id": log["user_id"], "month": now.month, "year": now.year},
            {"$inc": {"remaining_leave_quota": -1}}
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run enforcement on startup
    await enforce_2h_rule()
    yield

app = FastAPI(title="Absenlah API", lifespan=lifespan)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Absenlah API"}

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])

@app.get("/worker/stats")
async def get_worker_stats(current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow()
    stats = await user_stats_collection.find_one({
        "user_id": current_user["_id"],
        "month": now.month,
        "year": now.year
    })
    return stats or {
        "remaining_leave_quota": 0,
        "remaining_lateness_quota": 0
    }

app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(supervisor.router, prefix="/supervisor", tags=["Supervisor"])
app.include_router(leaves.router, prefix="/leaves", tags=["Leaves"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(uploads.router, prefix="/uploads", tags=["Uploads"])

from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="static"), name="static")
