from datetime import datetime, time, timedelta
from services.config import get_config

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
    fines_config = await get_config("LATENESS_FINES_JSON")

    # Fully Dynamic Logic based on Config Keys
    # Keys like "30", "60", "90" represent max mins for that tier
    sorted_tiers = sorted([int(k) for k in fines_config.keys() if k.isdigit()])

    fine_amount = 0
    last_tier = 0
    for tier in sorted_tiers:
        if lateness_mins <= tier:
            fine_amount = fines_config.get(str(tier))
            break
        last_tier = tier
    else:
        # After last digit tier
        after_val = fines_config.get("after", 10000)
        base_fine = fines_config.get(str(last_tier), 50000)
        extra_30m = (lateness_mins - last_tier + 29) // 30
        fine_amount = base_fine + (extra_30m * after_val)

    return lateness_mins, 0, fine_amount

async def calculate_overtime(check_out_time: datetime, actual_end: datetime):
    threshold = await get_config("OVERTIME_START_THRESHOLD_MINS")
    ot_threshold = actual_end + timedelta(minutes=threshold)

    if check_out_time <= ot_threshold:
        return 0, 0

    ot_mins = int((check_out_time - actual_end).total_seconds() / 60)
    ot_config = await get_config("OVERTIME_RATES_JSON")

    sorted_tiers = sorted([int(k) for k in ot_config.keys() if k.isdigit()])

    ot_amount = 0
    last_tier = 0
    for tier in sorted_tiers:
        if ot_mins <= tier:
            ot_amount = ot_config.get(str(tier))
            break
        last_tier = tier
    else:
        after_val = ot_config.get("after", 10000)
        base_ot = ot_config.get(str(last_tier), 50000)
        extra_30m = (ot_mins - last_tier + 29) // 30
        ot_amount = base_ot + (extra_30m * after_val)

    return ot_mins, ot_amount
