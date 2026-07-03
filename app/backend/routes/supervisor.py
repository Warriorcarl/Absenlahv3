from fastapi import APIRouter, Depends, HTTPException, status
from app.backend.schemas.base import LatenessCategory, RequestStatus
from app.backend.database.mongodb import attendance_logs_collection, user_stats_collection
from app.backend.routes.admin import get_current_user
from app.backend.services.stats import get_or_create_user_stats
from datetime import datetime

router = APIRouter()

async def get_supervisor_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.post("/approve-lateness/{log_id}")
async def approve_lateness(
    log_id: str,
    category: LatenessCategory,
    supervisor: dict = Depends(get_supervisor_user)
):
    log = await attendance_logs_collection.find_one({"_id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    user_id = log["user_id"]
    log_time = log["check_in_time"]

    # Update user_stats using the log's month/year
    await get_or_create_user_stats(user_id, log_time.month, log_time.year)

    update_query = {}
    if category == LatenessCategory.QUOTA:
        update_query = {"$inc": {"remaining_lateness_quota": -1}}
    elif category == LatenessCategory.LEAVE:
        update_query = {"$inc": {"remaining_leave_quota": -1}}
    elif category == LatenessCategory.EMERGENCY:
        update_query = {"$inc": {"remaining_emergency_quota": -1}}

    if update_query:
        await user_stats_collection.update_one(
            {"user_id": user_id, "month": log_time.month, "year": log_time.year},
            update_query
        )

    await attendance_logs_collection.update_one(
        {"_id": log_id},
        {"$set": {
            "status": RequestStatus.APPROVED,
            "lateness_category": category,
            "approved_by": supervisor["_id"],
            "updated_at": datetime.utcnow()
        }}
    )

    return {"message": "Lateness approved and quota updated"}
