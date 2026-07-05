import asyncio
from database.mongodb import users_collection
from services.auth import get_password_hash
from datetime import datetime
import uuid

async def seed_admin():
    # Wait for MongoDB to be ready
    import time
    for i in range(10):
        try:
            await users_collection.find_one({})
            break
        except Exception:
            print(f"Waiting for MongoDB... ({i+1}/10)")
            time.sleep(2)

    admin = await users_collection.find_one({"username": "administrator"})
    if not admin:
        print("Seeding default admin...")
        try:
            admin_user = {
                "_id": str(uuid.uuid4()),
                "username": "administrator",
                "email": "admin@absenlah.local",
                "full_name": "System Administrator",
                "role": "admin",
                "position": "Administrator",
                "password_hash": get_password_hash("admin123"),
                "hardware_id": None,
                "is_hardware_bound": False,
                "first_login_done": False, # Force change on first login
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            await users_collection.insert_one(admin_user)
            print("SUCCESS: Admin 'administrator' seeded with password 'admin123'")

            # Double check
            verify = await users_collection.find_one({"username": "administrator"})
            if verify:
                print("VERIFIED: Admin account is present in database.")
            else:
                print("ERROR: Admin account insertion failed or rolled back.")
        except Exception as e:
            print(f"CRITICAL ERROR during seeding: {e}")
    else:
        print("Admin account 'administrator' already exists. No action taken.")

if __name__ == "__main__":
    asyncio.run(seed_admin())
