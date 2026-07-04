import sys
import os

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from datetime import datetime, timedelta
import asyncio
from unittest.mock import patch, AsyncMock
from services.attendance import calculate_shift_times, calculate_lateness, calculate_overtime

# Mock DEFAULT_CONFIG for testing
MOCK_CONFIG = {
    "SHIFT_START_TIME": "10:00",
    "SHIFT_END_TIME": "20:00",
    "LATENESS_GRACE_PERIOD_MINS": 10,
    "ON_TIME_BONUS_AMOUNT": 20000,
    "OVERTIME_START_THRESHOLD_MINS": 1,
    "LATENESS_FINES_JSON": {
        "10:11-10:30": 5000,
        "10:31-11:00": 10000,
        "after_13:30": 10000
    },
    "OVERTIME_RATES_JSON": {
        "30": 5000,
        "60": 10000,
        "after_240": 10000
    }
}

async def mock_get_config(key):
    return MOCK_CONFIG.get(key)

@patch("app.backend.services.attendance.get_config", side_effect=mock_get_config)
async def test_logic(mock_cfg):
    print("Testing Attendance Logic...")

    # 1. Test Dynamic Shift (Early Check-in)
    check_in_early = datetime(2023, 10, 27, 9, 30) # 09:30 AM
    start, end = await calculate_shift_times(check_in_early)
    print(f"Early Check-in (09:30): Start={start.time()}, End={end.time()}")
    assert end == start + timedelta(hours=10)

    # 2. Test Standard Shift
    check_in_standard = datetime(2023, 10, 27, 10, 0) # 10:00 AM
    start, end = await calculate_shift_times(check_in_standard)
    print(f"Standard Check-in (10:00): Start={start.time()}, End={end.time()}")
    assert start.hour == 10 and end.hour == 20

    # 3. Test Lateness Grace Period
    check_in_grace = datetime(2023, 10, 27, 10, 10) # 10:10 AM
    mins, bonus, fine = await calculate_lateness(check_in_grace, start)
    print(f"Grace Period Check-in (10:10): Late={mins}m, Bonus={bonus}, Fine={fine}")
    assert mins == 0 and bonus == 20000

    # 4. Test Progressive Lateness Fine (10:31 -> 31 mins late from 10:00)
    check_in_late = datetime(2023, 10, 27, 10, 31)
    mins, bonus, fine = await calculate_lateness(check_in_late, start)
    print(f"Late Check-in (10:31): Late={mins}m, Bonus={bonus}, Fine={fine}")
    assert fine == 10000

    # 5. Test Overtime (20:31 -> 31 mins late from 20:00)
    check_out_ot = datetime(2023, 10, 27, 20, 31)
    mins, amount = await calculate_overtime(check_out_ot, end)
    print(f"Overtime Check-out (20:31): OT={mins}m, Amount={amount}")
    assert amount == 10000

    print("All attendance logic tests passed!")

if __name__ == "__main__":
    asyncio.run(test_logic())
