#!/bin/bash

FILE="PHASE_1_SCHEMA.md"

if [ ! -f "$FILE" ]; then
    echo "Error: $FILE not found."
    exit 1
fi

REQUIRED_ENTITIES=("users" "divisions" "geofences" "config_rules" "attendance_logs" "leave_requests" "user_stats")
REQUIRED_LOGIC=("hardware_id" "2-Hour Rule" "Dynamic Shift" "Lateness Quota" "Leave Quota" "Emergency Quota" "liveness_score" "Pekerja" "Bonus Disiplin")

FAILED=0

echo "Checking required entities..."
for entity in "${REQUIRED_ENTITIES[@]}"; do
    if grep -qi "$entity" "$FILE"; then
        echo "[OK] Entity: $entity"
    else
        echo "[FAIL] Entity: $entity"
        FAILED=1
    fi
done

echo "Checking required logic..."
for logic in "${REQUIRED_LOGIC[@]}"; do
    if grep -qi "$logic" "$FILE"; then
        echo "[OK] Logic: $logic"
    else
        echo "[FAIL] Logic: $logic"
        FAILED=1
    fi
done

if [ $FAILED -eq 0 ]; then
    echo "All schema validation checks passed!"
    exit 0
else
    echo "Some schema validation checks failed."
    exit 1
fi
