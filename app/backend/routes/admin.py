from fastapi import APIRouter, Depends, HTTPException, status
from database.mongodb import users_collection
from database.mongodb import geofences_collection
from routes.deps import get_admin_user
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/reset-device-binding/{user_id}")
async def reset_device_binding(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"hardware_id": None, "is_hardware_bound": False, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Device binding reset for user {user['username']}"}

@router.post("/geofences")
async def add_geofence(site: dict, admin: dict = Depends(get_admin_user)):
    site["_id"] = str(uuid.uuid4())
    site["created_at"] = datetime.utcnow()
    await geofences_collection.insert_one(site)
    return {"message": "Geofence added", "id": site["_id"]}

@router.get("/geofences")
async def list_geofences(admin: dict = Depends(get_admin_user)):
    return await geofences_collection.find().to_list(100)

@router.get("/export-attendance")
async def export_attendance(admin: dict = Depends(get_admin_user)):
    from database.mongodb import attendance_logs_collection
    import csv
    import io
    from fastapi.responses import StreamingResponse

    logs = await attendance_logs_collection.find().to_list(1000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["User ID", "Check In", "Check Out", "Lateness (m)", "OT (m)", "Status"])

    for log in logs:
        writer.writerow([
            log.get("user_id"),
            log.get("check_in_time"),
            log.get("check_out_time"),
            log.get("lateness_mins"),
            log.get("overtime_mins"),
            log.get("status")
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"}
    )

@router.get("/users")
async def list_users(admin: dict = Depends(get_admin_user)):
    # List all workers for easy management
    return await users_collection.find({"role": "pekerja"}).to_list(100)

@router.get("/summary")
async def get_admin_summary(admin: dict = Depends(get_admin_user)):
    from database.mongodb import users_collection, attendance_logs_collection, leave_requests_collection
    from datetime import datetime

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_workers = await users_collection.count_documents({"role": "pekerja"})
    present_today = await attendance_logs_collection.count_documents({"check_in_time": {"$gte": today_start}})
    late_today = await attendance_logs_collection.count_documents({
        "check_in_time": {"$gte": today_start},
        "lateness_mins": {"$gt": 0}
    })
    on_leave = await leave_requests_collection.count_documents({
        "status": "approved",
        "start_date": {"$lte": today_start},
        "end_date": {"$gte": today_start}
    })

    return {
        "total_workers": total_workers,
        "present_today": present_today,
        "late_today": late_today,
        "on_leave": on_leave
    }

@router.get("/config")
async def list_configs(admin: dict = Depends(get_admin_user)):
    from database.mongodb import config_rules_collection
    return await config_rules_collection.find().to_list(100)

@router.post("/config")
async def update_config(rule: dict, admin: dict = Depends(get_admin_user)):
    from services.config import set_config
    await set_config(rule["key"], rule["value"])
    return {"message": f"Config {rule['key']} updated"}
