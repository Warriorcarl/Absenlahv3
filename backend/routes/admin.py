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
        {"$set": {"hardware_id": None, "is_hardware_bound": False, "updated_at": datetime.now()}}
    )
    return {"message": f"Device binding reset for user {user['username']}"}

@router.post("/geofences")
async def add_geofence(site: dict, admin: dict = Depends(get_admin_user)):
    site["_id"] = str(uuid.uuid4())
    site["created_at"] = datetime.now()
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

@router.get("/export-pdf")
async def export_attendance_pdf(admin: dict = Depends(get_admin_user)):
    from database.mongodb import attendance_logs_collection
    from reportlab.pdfgen import canvas
    import io
    from fastapi.responses import StreamingResponse

    logs = await attendance_logs_collection.find().to_list(1000)

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 800, "Absenlah Attendance Report")

    y = 750
    for log in logs:
        text = f"User: {log.get('user_id')} | In: {log.get('check_in_time')} | Status: {log.get('status')}"
        p.drawString(100, y, text)
        y -= 20
        if y < 50:
            p.showPage()
            y = 800

    p.save()
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=report.pdf"})

@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 10,
    search: str = None,
    admin: dict = Depends(get_admin_user)
):
    query = {"role": "pekerja"}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}}
        ]

    users = await users_collection.find(query).skip(skip).limit(limit).to_list(limit)
    total = await users_collection.count_documents(query)
    return {"users": users, "total": total}

@router.get("/summary")
async def get_admin_summary(admin: dict = Depends(get_admin_user)):
    from database.mongodb import users_collection, attendance_logs_collection, leave_requests_collection
    from datetime import datetime

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

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
