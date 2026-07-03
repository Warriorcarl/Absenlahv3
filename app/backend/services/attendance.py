from datetime import datetime, time, timedelta
from app.backend.services.config import get_config

async def calculate_shift_times(check_in_time: datetime):
    shift_start_str = await get_config("SHIFT_START_TIME")
    shift_end_str = await get_config("SHIFT_END_TIME")

    # Parse standard shift start
    start_h, start_m = map(int, shift_start_str.split(":"))
    standard_start = check_in_time.replace(hour=start_h, minute=start_m, second=0, microsecond=0)

    # Dynamic Shift Logic: If worker checks in before standard start, lock to 10 hours
    if check_in_time < standard_start:
        actual_start = check_in_time
        actual_end = actual_start + timedelta(hours=10)
    else:
        actual_start = standard_start
        end_h, end_m = map(int, shift_end_str.split(":"))
        actual_end = check_in_time.replace(hour=end_h, minute=end_m, second=0, microsecond=0)

    return actual_start, actual_end

async def calculate_lateness(check_in_time: datetime, actual_start: datetime):
    grace_period = await get_config("LATENESS_GRACE_PERIOD_MINS")
    late_threshold = actual_start + timedelta(minutes=grace_period)

    if check_in_time <= late_threshold:
        return 0, await get_config("ON_TIME_BONUS_AMOUNT"), 0

    lateness_mins = int((check_in_time - actual_start).total_seconds() / 60)

    # Progressive Lateness Fines
    fines_config = await get_config("LATENESS_FINES_JSON")
    fine_amount = 0

    # Logic for matching lateness_mins to fines_config
    # 10:11-10:30 (11-30 mins), etc.
    if lateness_mins <= 30:
        fine_amount = fines_config.get("10:11-10:30", 5000)
    elif lateness_mins <= 60:
        fine_amount = fines_config.get("10:31-11:00", 10000)
    elif lateness_mins <= 90:
        fine_amount = fines_config.get("11:01-11:30", 15000)
    elif lateness_mins <= 120:
        fine_amount = fines_config.get("11:31-12:00", 20000)
    elif lateness_mins <= 150:
        fine_amount = fines_config.get("12:01-12:30", 30000)
    elif lateness_mins <= 180:
        fine_amount = fines_config.get("12:31-13:00", 40000)
    elif lateness_mins <= 210:
        fine_amount = fines_config.get("13:01-13:30", 50000)
    else:
        # +10k per 30 mins after 13:30 (210 mins late)
        extra_30m = (lateness_mins - 210 + 29) // 30
        fine_amount = 50000 + (extra_30m * fines_config.get("after_13:30", 10000))

    return lateness_mins, 0, fine_amount

async def calculate_overtime(check_out_time: datetime, actual_end: datetime):
    threshold = await get_config("OVERTIME_START_THRESHOLD_MINS")
    ot_threshold = actual_end + timedelta(minutes=threshold)

    if check_out_time <= ot_threshold:
        return 0, 0

    ot_mins = int((check_out_time - actual_end).total_seconds() / 60)
    ot_config = await get_config("OVERTIME_RATES_JSON")
    ot_amount = 0

    if ot_mins <= 30:
        ot_amount = ot_config.get("30", 5000)
    elif ot_mins <= 60:
        ot_amount = ot_config.get("60", 10000)
    elif ot_mins <= 90:
        ot_amount = ot_config.get("90", 15000)
    elif ot_mins <= 120:
        ot_amount = ot_config.get("120", 20000)
    elif ot_mins <= 150:
        ot_amount = ot_config.get("150", 30000)
    elif ot_mins <= 180:
        ot_amount = ot_config.get("180", 30000)
    elif ot_mins <= 210:
        ot_amount = ot_config.get("210", 40000)
    elif ot_mins <= 240:
        ot_amount = ot_config.get("240", 50000)
    else:
        # +10k per 30 mins after 240 mins
        extra_30m = (ot_mins - 240 + 29) // 30
        ot_amount = 50000 + (extra_30m * ot_config.get("after_240", 10000))

    return ot_mins, ot_amount
