from fastapi import APIRouter, Depends, HTTPException, status
from schemas.base import LatenessCategory, RequestStatus
from database.mongodb import attendance_logs_collection, user_stats_collection, serializable
from routes.deps import get_admin_user, get_current_user
from services.stats import get_or_create_user_stats
from datetime import datetime, timedelta

router = APIRouter()

async def get_supervisor_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("/pending-logs")
async def get_pending_logs(supervisor: dict = Depends(get_supervisor_user)):
    logs = await attendance_logs_collection.find({"status": RequestStatus.PENDING}).to_list(100)
    return serializable(logs)

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
        # Requirement: Personal emergency quota is Max 2x per 6 months.
        # Search all logs for this user in the last 6 months that used emergency category
        six_months_ago = log_time - timedelta(days=180)
        count = await attendance_logs_collection.count_documents({
            "user_id": user_id,
            "lateness_category": LatenessCategory.EMERGENCY,
            "check_in_time": {"$gte": six_months_ago}
        })

        if count >= 2:
            raise HTTPException(status_code=400, detail="Personal Emergency Quota exhausted (Max 2 per 6 months)")
        update_query = {"$inc": {"remaining_emergency_quota": -1}}

    if update_query:
        # Also aggregate fines if any
        if log.get("lateness_fine_amount", 0) > 0:
            if "$inc" not in update_query: update_query["$inc"] = {}
            update_query["$inc"]["total_lateness_fines"] = log["lateness_fine_amount"]

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
            "updated_at": datetime.now()
        }}
    )

    return {"message": "Lateness approved and quota updated"}

@router.post("/bulk-approve-lateness")
async def bulk_approve_lateness(
    log_ids: list[str],
    category: LatenessCategory,
    supervisor: dict = Depends(get_supervisor_user)
):
    results = []
    for log_id in log_ids:
        try:
            res = await approve_lateness(log_id, category, supervisor)
            results.append({"id": log_id, "status": "success"})
        except Exception as e:
            results.append({"id": log_id, "status": "failed", "error": str(e)})

    return {"results": results}
