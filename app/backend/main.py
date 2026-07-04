from fastapi import FastAPI
from routes import auth, attendance, supervisor, leaves, admin
from database.mongodb import user_stats_collection
from routes.deps import get_current_user
from datetime import datetime
from fastapi import Depends

app = FastAPI(title="Absenlah API")

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
