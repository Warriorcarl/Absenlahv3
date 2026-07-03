from app.backend.database.mongodb import config_rules_collection

DEFAULT_CONFIG = {
    "SHIFT_START_TIME": "10:00",
    "SHIFT_END_TIME": "20:00",
    "LATENESS_GRACE_PERIOD_MINS": 10,
    "ON_TIME_BONUS_AMOUNT": 20000,
    "OVERTIME_START_THRESHOLD_MINS": 1,
    "EARLY_DEPARTURE_THRESHOLD_TIME": "17:00",
    "MAX_LATENESS_QUOTA_MONTHLY": 2,
    "MAX_EARLY_DEPARTURE_MONTHLY": 3,
    "MAX_EMERGENCY_QUOTA_6_MONTHS": 2,
    "MANUAL_CHECKIN_MAX_ARRIVAL_TIME_HOURS": 2,
    "MANUAL_CHECKIN_AUTO_FAIL_TIME": "14:00",
    "LATENESS_FINES_JSON": {
        "10:11-10:30": 5000,
        "10:31-11:00": 10000,
        "11:01-11:30": 15000,
        "11:31-12:00": 20000,
        "12:01-12:30": 30000,
        "12:31-13:00": 40000,
        "13:01-13:30": 50000,
        "after_13:30": 10000 # +10k per 30 mins
    },
    "OVERTIME_RATES_JSON": {
        "30": 5000,
        "60": 10000,
        "90": 15000,
        "120": 20000,
        "150": 30000,
        "180": 30000,
        "210": 40000,
        "240": 50000,
        "after_240": 10000 # +10k per 30 mins
    }
}

async def get_config(key: str):
    rule = await config_rules_collection.find_one({"key": key})
    if rule:
        return rule["value"]
    return DEFAULT_CONFIG.get(key)

from datetime import datetime

async def set_config(key: str, value: any):
    await config_rules_collection.update_one(
        {"key": key},
        {"$set": {"value": value, "updated_at": datetime.utcnow()}},
        upsert=True
    )
