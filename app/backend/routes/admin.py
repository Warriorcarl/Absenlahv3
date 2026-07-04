from fastapi import APIRouter, Depends, HTTPException, status
from database.mongodb import users_collection
from database.mongodb import geofences_collection
from routes.deps import get_admin_user
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/reset-device-binding/{user_id}")
async def reset_device_binding(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"hardware_id": None, "is_hardware_bound": False, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Device binding reset for user {user['username']}"}

@router.post("/geofences")
async def add_geofence(site: dict, admin: dict = Depends(get_admin_user)):
    site["_id"] = str(uuid.uuid4())
    site["created_at"] = datetime.utcnow()
    await geofences_collection.insert_one(site)
    return {"message": "Geofence added", "id": site["_id"]}

@router.get("/geofences")
async def list_geofences(admin: dict = Depends(get_admin_user)):
    return await geofences_collection.find().to_list(100)

@router.get("/users")
async def list_users(admin: dict = Depends(get_admin_user)):
    # List all workers for easy management
    return await users_collection.find({"role": "pekerja"}).to_list(100)

@router.get("/config")
async def list_configs(admin: dict = Depends(get_admin_user)):
    from database.mongodb import config_rules_collection
    return await config_rules_collection.find().to_list(100)

@router.post("/config")
async def update_config(rule: dict, admin: dict = Depends(get_admin_user)):
    from services.config import set_config
    await set_config(rule["key"], rule["value"])
    return {"message": f"Config {rule['key']} updated"}
