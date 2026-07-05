from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from schemas.base import AttendanceLogCreate, AttendanceLogUpdate, RequestStatus
from database.mongodb import attendance_logs_collection, user_stats_collection
from routes.deps import get_current_user
from services.attendance import calculate_shift_times, calculate_lateness, calculate_overtime
from services.config import get_config
from services.geofence import is_within_geofence
from services.stats import get_or_create_user_stats
from database.mongodb import geofences_collection
import uuid

router = APIRouter()

@router.post("/check-in")
async def check_in(
    log: AttendanceLogCreate,
    current_user: dict = Depends(get_current_user)
):
    # Security: Use server time for check-in
    server_now = datetime.now()
    log.check_in_time = server_now

    # Mandatory Liveness Check
    if log.liveness_score < 0.8: # Threshold 0.8
         raise HTTPException(status_code=400, detail="Liveness detection failed")

    # Geofence Validation (unless manual check-in)
    if not log.is_manual:
        # Auto-detect nearest geofence if none provided
        if not log.geofence_id:
            all_geofences = await geofences_collection.find({"is_active": True}).to_list(None)
            found_geofence = None
            for gf in all_geofences:
                if await is_within_geofence(log.check_in_lat, log.check_in_long, gf):
                    found_geofence = gf
                    break

            if not found_geofence:
                raise HTTPException(status_code=403, detail="No valid geofence found at your location")
            log.geofence_id = found_geofence["_id"]
        else:
            geofence = await geofences_collection.find_one({"_id": log.geofence_id})
            if not geofence or not await is_within_geofence(log.check_in_lat, log.check_in_long, geofence):
                raise HTTPException(status_code=403, detail="You are outside the geofence area")

    # Check if already checked in today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if await attendance_logs_collection.find_one({"user_id": current_user["_id"], "check_in_time": {"$gte": today_start}}):
        raise HTTPException(status_code=400, detail="Already checked in today")

    actual_start, actual_end = await calculate_shift_times(log.check_in_time)
    lateness_mins, bonus_disiplin, lateness_fine = await calculate_lateness(log.check_in_time, actual_start)

    log_dict = log.dict()
    log_dict["_id"] = str(uuid.uuid4())
    log_dict["user_id"] = current_user["_id"]
    log_dict["actual_shift_start"] = actual_start
    log_dict["actual_shift_end"] = actual_end
    log_dict["lateness_mins"] = lateness_mins
    log_dict["bonus_disiplin"] = bonus_disiplin
    log_dict["lateness_fine_amount"] = lateness_fine
    log_dict["status"] = RequestStatus.PENDING if lateness_mins > 0 or log.is_manual else RequestStatus.APPROVED
    log_dict["created_at"] = datetime.now()

    # Ensure stats are initialized for the month
    await get_or_create_user_stats(current_user["_id"], log.check_in_time.month, log.check_in_time.year)

    await attendance_logs_collection.insert_one(log_dict)

    # Update total Discipline Bonus for the month
    if bonus_disiplin > 0:
        await user_stats_collection.update_one(
            {"user_id": current_user["_id"], "month": server_now.month, "year": server_now.year},
            {"$inc": {"total_bonus_disiplin": bonus_disiplin}}
        )

    return {"message": "Checked in successfully", "log_id": log_dict["_id"]}

@router.post("/check-out/{log_id}")
async def check_out(log_id: str, update: AttendanceLogUpdate, current_user: dict = Depends(get_current_user)):
    # Security: Use server time for check-out
    server_now = datetime.now()
    update.check_out_time = server_now

    log = await attendance_logs_collection.find_one({"_id": log_id, "user_id": current_user["_id"]})
    if not log:
        raise HTTPException(status_code=404, detail="Attendance log not found")

    if log.get("check_out_time"):
        raise HTTPException(status_code=400, detail="Already checked out")

    # Early Departure Logic
    early_departure = False
    early_threshold_str = await get_config("EARLY_DEPARTURE_THRESHOLD_TIME")
    h, m = map(int, early_threshold_str.split(":"))
    early_threshold = update.check_out_time.replace(hour=h, minute=m, second=0, microsecond=0)

    if update.check_out_time < early_threshold:
        early_departure = True
        # Violation: Deduct Discipline Bonus and Leave Quota
        await attendance_logs_collection.update_one(
            {"_id": log_id},
            {"$set": {"bonus_disiplin": 0, "early_departure": True}}
        )
        # Automated deduction for Leave Quota and Early Departure Quota
        await user_stats_collection.update_one(
            {"user_id": current_user["_id"], "month": server_now.month, "year": server_now.year},
            {"$inc": {
                "remaining_leave_quota": -1,
                "remaining_early_departure_quota": -1
            }}
        )

    ot_mins, ot_amount = await calculate_overtime(update.check_out_time, log["actual_shift_end"])

    await attendance_logs_collection.update_one(
        {"_id": log_id},
        {"$set": {
            "check_out_time": update.check_out_time,
            "check_out_lat": update.check_out_lat,
            "check_out_long": update.check_out_long,
            "overtime_mins": ot_mins,
            "overtime_amount": ot_amount,
            "early_departure": early_departure,
            "updated_at": datetime.now()
        }}
    )

    msg = "Checked out successfully"
    if early_departure:
        msg += " (Early Departure detected - Discipline Bonus deducted)"
        # Revert bonus if previously applied during check-in
        await user_stats_collection.update_one(
            {"user_id": current_user["_id"], "month": server_now.month, "year": server_now.year},
            {"$inc": {"total_bonus_disiplin": -log.get("bonus_disiplin", 0)}}
        )

    # Update total Overtime for the month
    if ot_amount > 0:
        await user_stats_collection.update_one(
            {"user_id": current_user["_id"], "month": server_now.month, "year": server_now.year},
            {"$inc": {"total_overtime_earned": ot_amount}}
        )

    return {"message": msg}

@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    logs = await attendance_logs_collection.find({"user_id": current_user["_id"]}).sort("check_in_time", -1).to_list(100)
    return logs

@router.get("/all-logs")
async def get_all_logs(admin: dict = Depends(get_current_user)):
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    logs = await attendance_logs_collection.find().sort("check_in_time", -1).to_list(100)
    return logs

@router.post("/confirm-arrival/{log_id}")
async def confirm_arrival(log_id: str, current_user: dict = Depends(get_current_user)):
    # Security: Use server time for arrival confirmation
    arrival_time = datetime.now()

    # Handle "latest" log_id
    if log_id == "latest":
        log = await attendance_logs_collection.find_one(
            {"user_id": current_user["_id"]},
            sort=[("check_in_time", -1)]
        )
    else:
        log = await attendance_logs_collection.find_one({"_id": log_id, "user_id": current_user["_id"]})
    if not log or not log.get("is_manual"):
        raise HTTPException(status_code=400, detail="Not a manual check-in or log not found")

    # 2-Hour Rule & 14:00 Rule
    check_in_time = log["check_in_time"]
    time_diff = (arrival_time - check_in_time).total_seconds() / 3600

    fail_threshold_hours = await get_config("MANUAL_CHECKIN_MAX_ARRIVAL_TIME_HOURS")
    auto_fail_time_str = await get_config("MANUAL_CHECKIN_AUTO_FAIL_TIME")
    h, m = map(int, auto_fail_time_str.split(":"))
    auto_fail_deadline = arrival_time.replace(hour=h, minute=m, second=0, microsecond=0)

    violation = False
    if time_diff > fail_threshold_hours or arrival_time > auto_fail_deadline:
        violation = True

    await attendance_logs_collection.update_one(
        {"_id": log["_id"]},
        {"$set": {
            "arrival_at_warehouse_time": arrival_time,
            "manual_arrival_violation": violation,
            "updated_at": datetime.now()
        }}
    )

    if violation:
        # Automated deduction for Leave Quota (Potong Jatah Libur) + Lateness Fine
        # Calculate lateness fine based on arrival time at warehouse
        from services.config import get_config
        from services.attendance import calculate_lateness

        shift_start_str = await get_config("SHIFT_START_TIME")
        h, m = map(int, shift_start_str.split(":"))
        standard_start = arrival_time.replace(hour=h, minute=m, second=0, microsecond=0)

        _, _, lateness_fine = await calculate_lateness(arrival_time, standard_start)

        await attendance_logs_collection.update_one(
            {"_id": log["_id"]},
            {"$set": {
                "lateness_fine_amount": lateness_fine,
                "status": "rejected",
                "bonus_disiplin": 0
            }}
        )

        await user_stats_collection.update_one(
            {"user_id": current_user["_id"], "month": log["check_in_time"].month, "year": log["check_in_time"].year},
            {"$inc": {
                "remaining_leave_quota": -1,
                "total_lateness_fines": lateness_fine
            }}
        )
        return {"message": f"Arrival confirmed with violation. Fine Rp{lateness_fine} and Potong Jatah Libur applied."}
    return {"message": "Arrival confirmed on time"}
