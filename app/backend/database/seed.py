import asyncio
from app.backend.database.mongodb import users_collection
from app.backend.services.auth import get_password_hash
from datetime import datetime
import uuid

async def seed_admin():
    admin = await users_collection.find_one({"username": "administrator"})
    if not admin:
        print("Seeding default admin...")
        admin_user = {
            "_id": str(uuid.uuid4()),
            "username": "administrator",
            "email": "admin@absenlah.local",
            "full_name": "System Administrator",
            "role": "admin",
            "password_hash": get_password_hash("admin123"),
            "hardware_id": None,
            "is_hardware_bound": False,
            "first_login_done": False, # Force change on first login
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(admin_user)
        print("Admin seeded successfully.")
    else:
        print("Admin already exists.")

if __name__ == "__main__":
    asyncio.run(seed_admin())
