from fastapi import APIRouter, Depends, HTTPException, status
from schemas.base import LeaveRequestCreate, RequestStatus
from database.mongodb import leave_requests_collection, users_collection
from routes.deps import get_current_user
from routes.supervisor import get_supervisor_user
from datetime import datetime, timedelta
import uuid

router = APIRouter()

from services.config import get_config

@router.post("/request")
async def request_leave(leave: LeaveRequestCreate, current_user: dict = Depends(get_current_user)):
    # Requirement: Must submit >= 2 hours before shift
    now = datetime.utcnow()
    shift_start_str = await get_config("SHIFT_START_TIME")
    h, m = map(int, shift_start_str.split(":"))
    shift_start_today = now.replace(hour=h, minute=m, second=0, microsecond=0)

    if leave.start_date.date() == now.date():
        if (shift_start_today - now).total_seconds() < 2 * 3600:
            raise HTTPException(status_code=400, detail="Leave requests must be submitted at least 2 hours before shift start")

    # Blocking logic: check if another approved leave in the same POSITION on same date
    # Requirement: Auto-reject if another worker in the same position is already on leave.

    # We need to find all users with the same position
    same_position_users = await users_collection.find({"position": current_user["position"]}).to_list(None)
    user_ids = [u["_id"] for u in same_position_users]

    existing_leave = await leave_requests_collection.find_one({
        "user_id": {"$in": user_ids},
        "status": RequestStatus.APPROVED,
        "start_date": {"$lte": leave.end_date},
        "end_date": {"$gte": leave.start_date}
    })

    if existing_leave:
        raise HTTPException(status_code=400, detail="Another worker in your division is already on leave during this period")

    leave_dict = leave.dict()
    leave_dict["_id"] = str(uuid.uuid4())
    leave_dict["user_id"] = current_user["_id"]
    leave_dict["division_id"] = current_user["division_id"]
    leave_dict["status"] = RequestStatus.PENDING
    leave_dict["created_at"] = datetime.utcnow()

    await leave_requests_collection.insert_one(leave_dict)
    return {"message": "Leave request submitted", "leave_id": leave_dict["_id"]}

@router.get("/my-history")
async def get_my_leaves(current_user: dict = Depends(get_current_user)):
    leaves = await leave_requests_collection.find({"user_id": current_user["_id"]}).to_list(100)
    return leaves

@router.get("/division-leaves")
async def get_division_leaves(current_user: dict = Depends(get_current_user)):
    # Visibility logic: ONLY same division
    leaves = await leave_requests_collection.find({"division_id": current_user["division_id"]}).to_list(100)
    return leaves

@router.post("/approve/{leave_id}")
async def approve_leave(leave_id: str, status: RequestStatus, supervisor: dict = Depends(get_supervisor_user)):
    if status not in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Invalid status")

    await leave_requests_collection.update_one(
        {"_id": leave_id},
        {"$set": {
            "status": status,
            "approved_by": supervisor["_id"],
            "updated_at": datetime.utcnow()
        }}
    )
    return {"message": f"Leave request {status}"}

@router.post("/cancel/{leave_id}")
async def cancel_leave(leave_id: str, current_user: dict = Depends(get_current_user)):
    leave = await leave_requests_collection.find_one({"_id": leave_id, "user_id": current_user["_id"]})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    # Requirement: Can cancel until H-1
    now = datetime.utcnow()
    h_minus_1 = leave["start_date"].replace(hour=0, minute=0, second=0) - timedelta(days=1)

    if now > h_minus_1:
        raise HTTPException(status_code=400, detail="Cannot cancel leave after H-1")

    await leave_requests_collection.update_one(
        {"_id": leave_id},
        {"$set": {
            "status": RequestStatus.CANCELLED,
            "updated_at": now
        }}
    )

    # Mock Push Notification to same division
    print(f"DEBUG: Push notification sent to division {leave['division_id']} regarding cancellation")

    return {"message": "Leave cancelled successfully"}
