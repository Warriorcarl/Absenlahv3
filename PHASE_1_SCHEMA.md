# Phase 1: Database Schema & Config Engine - Absenlah

This document outlines the database schema and relationship logic for the Absenlah enterprise attendance application.

## 1. Core Data Models

### `users`
Represents employees (Pekerja), Supervisors, and Administrators.
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `email`: String (Unique)
- `password_hash`: String
- `full_name`: String
- `role`: Enum ('admin', 'supervisor', 'pekerja')
- `division_id`: FK -> `divisions.id`
- `google_id`: String (Optional, for OAuth)
- `hardware_id`: String (Unique, bound on first login)
- `is_hardware_bound`: Boolean (Default: false)
- `first_login_done`: Boolean (Default: false)
- `profile_picture_url`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

### `divisions`
Represents organizational units.
- `id`: UUID (Primary Key)
- `name`: String (e.g., 'Warehouse', 'Sales')
- `description`: String
- `created_at`: Timestamp

### `geofences` (Location Management)
Managed by Admin to define valid check-in zones.
- `id`: UUID (Primary Key)
- `site_name`: String
- `latitude`: Float
- `longitude`: Float
- `radius_meters`: Integer (e.g., 100)
- `address`: String
- `is_active`: Boolean
- `created_at`: Timestamp

## 2. Configuration & Rule Engine

### `config_rules` (Dynamic Rule Engine)
Allows real-time updates to business logic without code changes.
- `id`: UUID (Primary Key)
- `key`: String (Unique, e.g., 'LATENESS_THRESHOLD_MINS')
- `value`: String/JSON (Value for the rule)
- `description`: String
- `updated_by`: FK -> `users.id`
- `updated_at`: Timestamp

**Default Config Keys:**
- `SHIFT_START_TIME`: "10:00"
- `SHIFT_END_TIME`: "20:00"
- `LATENESS_GRACE_PERIOD_MINS`: 10 (Lateness starts at 10:11)
- `ON_TIME_BONUS_AMOUNT`: 20000
- `OVERTIME_START_THRESHOLD_MINS`: 1
- `EARLY_DEPARTURE_THRESHOLD_TIME`: "17:00"
- `MAX_LATENESS_QUOTA_MONTHLY`: 2
- `MAX_EARLY_DEPARTURE_MONTHLY`: 3
- `MAX_EMERGENCY_QUOTA_6_MONTHS`: 2
- `MANUAL_CHECKIN_MAX_ARRIVAL_TIME_HOURS`: 2
- `MANUAL_CHECKIN_AUTO_FAIL_TIME`: "14:00"
- `LATENESS_FINES_JSON`: Map of time ranges to IDR amounts.
- `OVERTIME_RATES_JSON`: Map of duration ranges to IDR amounts.

## 3. Attendance & Leave Models

### `attendance_logs`
Tracks daily check-ins and check-outs.
- `id`: UUID (Primary Key)
- `user_id`: FK -> `users.id`
- `check_in_time`: Timestamp (Actual time of check-in)
- `check_out_time`: Timestamp (Actual time of check-out)
- `check_in_lat`: Float
- `check_in_long`: Float
- `check_out_lat`: Float
- `check_out_long`: Float
- `geofence_id`: FK -> `geofences.id` (null if manual)
- `is_manual`: Boolean (True for courier/emergency manual attendance)
- `manual_reason`: String
- `manual_proof_photo_url`: String
- `arrival_at_warehouse_time`: Timestamp (For 2-hour rule tracking)
- `liveness_score`: Float (Result from anti-spoofing)
- `is_liveness_verified`: Boolean
- `lateness_mins`: Integer
- `lateness_category`: Enum ('quota', 'leave', 'emergency', 'unapproved')
- `lateness_fine_amount`: IDR
- `bonus_disiplin`: IDR (Bonus Disiplin)
- `overtime_mins`: Integer
- `overtime_amount`: IDR
- `early_departure`: Boolean
- `status`: Enum ('pending', 'approved', 'rejected')
- `approved_by`: FK -> `users.id`
- `created_at`: Timestamp

### `leave_requests`
Manages employee time-off requests.
- `id`: UUID (Primary Key)
- `user_id`: FK -> `users.id`
- `leave_type`: Enum ('annual', 'emergency', 'sick')
- `start_date`: Date
- `end_date`: Date
- `reason`: String
- `proof_url`: String (Mandatory for sick/emergency)
- `division_id`: FK -> `divisions.id` (For visibility control)
- `status`: Enum ('pending', 'approved', 'rejected', 'cancelled')
- `approved_by`: FK -> `users.id`
- `rejection_reason`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

## 4. Statistics & Quotas

### `user_stats`
Tracks monthly and bi-annual quotas for each worker.
- `id`: UUID (Primary Key)
- `user_id`: FK -> `users.id`
- `month`: Integer (1-12)
- `year`: Integer
- `remaining_lateness_quota`: Integer (Initial 2/month)
- `remaining_leave_quota`: Integer (Based on company policy)
- `remaining_early_departure_quota`: Integer (Initial 3/month)
- `remaining_emergency_quota`: Integer (Initial 2/6-months, tracked bi-annually)
- `total_lateness_fines`: IDR
- `total_overtime_earned`: IDR
- `total_bonus_disiplin`: IDR (Total Bonus Disiplin)
- `updated_at`: Timestamp

## 5. Custom SOP Logic & Relationships

### Lateness Approval & Quota Deduction
When an `attendance_log` is flagged as late, a Supervisor must approve the categorization:
1. **Lateness Quota (Jatah Telat)**: Max 2x/month. Deducts from `user_stats.remaining_lateness_quota`.
2. **Leave Quota (Jatah Libur)**: Applied if 3rd lateness or selected by supervisor. Deducts from `user_stats.remaining_leave_quota`.
3. **Emergency Quota (Jatah Darurat Pribadi)**: Max 2x per 6 months. Requires photo proof. Deducts from `user_stats.remaining_emergency_quota`.

### Manual Check-in (2-Hour Rule)
- For `is_manual = True` logs, the system captures `check_in_time`.
- `arrival_at_warehouse_time` must be updated via a specific endpoint upon physical arrival.
- Logic: If `arrival_at_warehouse_time` - `check_in_time` > 2 hours OR `arrival_at_warehouse_time` > 14:00:
    - Automatically apply lateness fine.
    - Deduct Leave Quota (Potong Jatah Libur).

### Dynamic Shift Logic
- Default: 10:00 AM - 08:00 PM.
- If `check_in_time` < 10:00 AM: Shift duration is locked to exactly 10 hours from `check_in_time`. (e.g., Check-in 09:30 -> Shift ends 19:30).

### Leave Request Visibility & Blocking
- **Blocking**: Before creating a `leave_request`, the system checks for any other approved `leave_request` for the same `division_id` on the same date.
- **Visibility**: The `leave_request` list is filtered by `division_id`, ensuring workers only see leaves within their own division.

### Device Binding
- On login, if `user.is_hardware_bound` is False, the system captures the device `hardware_id` and sets `is_hardware_bound = True`.
- Subsequent logins must match the `hardware_id`.
- Admins can call `reset_device_binding` to set `is_hardware_bound = False`.
