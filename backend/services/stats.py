from database.mongodb import user_stats_collection, serializable
from services.config import get_config
from datetime import datetime

async def get_or_create_user_stats(user_id: str, month: int, year: int):
    stats = await user_stats_collection.find_one({"user_id": user_id, "month": month, "year": year})
    if not stats:
        # Fetch default quotas from config
        max_late = await get_config("MAX_LATENESS_QUOTA_MONTHLY")
        max_early = await get_config("MAX_EARLY_DEPARTURE_MONTHLY")
        max_emergency = await get_config("MAX_EMERGENCY_QUOTA_6_MONTHS")

        # Check previous month for leave quota carryover
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        prev_stats = await user_stats_collection.find_one({"user_id": user_id, "month": prev_month, "year": prev_year})

        remaining_leave = prev_stats.get("remaining_leave_quota", 12) if prev_stats else 12

        stats = {
            "user_id": user_id,
            "month": month,
            "year": year,
            "remaining_lateness_quota": max_late if max_late is not None else 2,
            "remaining_leave_quota": remaining_leave,
            "remaining_early_departure_quota": max_early if max_early is not None else 3,
            "remaining_emergency_quota": max_emergency if max_emergency is not None else 2,
            "total_lateness_fines": 0,
            "total_overtime_earned": 0,
            "total_bonus_disiplin": 0,
            "updated_at": datetime.now()
        }
        await user_stats_collection.insert_one(stats)
    return serializable(stats)
