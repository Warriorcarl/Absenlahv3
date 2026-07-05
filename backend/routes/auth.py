from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime
from typing import Optional
from schemas.base import UserCreate, UserBase, LoginRequest, ChangePasswordRequest, GoogleLoginRequest
from services.auth import get_password_hash, verify_password, create_access_token
from services.google_auth import verify_google_token
from database.mongodb import users_collection
from routes.deps import get_current_user
import uuid

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    # Check if user exists
    if await users_collection.find_one({"$or": [{"username": user.username}, {"email": user.email}]}):
        raise HTTPException(status_code=400, detail="Username or Email already registered")

    user_dict = user.dict()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    user_dict["_id"] = str(uuid.uuid4())
    user_dict["division_id"] = user_dict.get("division_id") or "default"
    user_dict["hardware_id"] = None
    user_dict["is_hardware_bound"] = False
    user_dict["first_login_done"] = False
    user_dict["created_at"] = datetime.now()
    user_dict["updated_at"] = datetime.now()

    await users_collection.insert_one(user_dict)
    return {"message": "User registered successfully"}

@router.get("/health")
async def health():
    try:
        count = await users_collection.count_documents({})
        admin = await users_collection.find_one({"username": "administrator"})
        return {
            "status": "healthy",
            "db_connected": True,
            "total_users": count,
            "admin_exists": admin is not None
        }
    except Exception as e:
        return {"status": "unhealthy", "db_connected": False, "error": str(e)}

@router.post("/login")
async def login(req: LoginRequest):
    # Support login via Email or Username (Case Insensitive)
    user = await users_collection.find_one({
        "$or": [
            {"username": {"$regex": f"^{req.username}$", "$options": "i"}},
            {"email": {"$regex": f"^{req.username}$", "$options": "i"}}
        ]
    })

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Device Binding Logic
    if user["role"] == "pekerja":
        if not req.hardware_id:
            raise HTTPException(status_code=400, detail="Hardware ID is required for pekerja")

        if not user.get("is_hardware_bound"):
            # First time login for pekerja, bind the device
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"hardware_id": req.hardware_id, "is_hardware_bound": True, "updated_at": datetime.now()}}
            )
        else:
            # Check if hardware_id matches
            if user.get("hardware_id") != req.hardware_id:
                raise HTTPException(status_code=403, detail="Account bound to another device")

    # Force Password Change for Admin on first login
    force_password_change = False
    if user["username"] == "administrator" and not user.get("first_login_done"):
        force_password_change = True

    access_token = create_access_token(data={"sub": user["username"], "role": user["role"], "user_id": user["_id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "force_password_change": force_password_change
    }

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "password_hash": get_password_hash(req.new_password),
            "first_login_done": True,
            "updated_at": datetime.now()
        }}
    )
    return {"message": "Password changed successfully"}

@router.post("/google-login")
async def google_login(req: GoogleLoginRequest):
    google_data = await verify_google_token(req.token)
    email = google_data["email"]

    user = await users_collection.find_one({"email": email})
    if not user:
        # Auto-register Google users as pekerja
        user = {
            "_id": str(uuid.uuid4()),
            "username": email.split("@")[0],
            "email": email,
            "full_name": google_data.get("name", ""),
            "role": "pekerja",
            "position": "Staff",
            "password_hash": None,
            "google_id": google_data["sub"],
            "hardware_id": None,
            "is_hardware_bound": False,
            "first_login_done": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        await users_collection.insert_one(user)

    # Apply Hardware Binding for Google Auth too
    if user["role"] == "pekerja":
        if not req.hardware_id:
            raise HTTPException(status_code=400, detail="Hardware ID is required for pekerja")

        if not user.get("is_hardware_bound"):
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"hardware_id": req.hardware_id, "is_hardware_bound": True, "updated_at": datetime.now()}}
            )
        elif user.get("hardware_id") != req.hardware_id:
            raise HTTPException(status_code=403, detail="Account bound to another device")

    access_token = create_access_token(data={"sub": user["username"], "role": user["role"], "user_id": user["_id"]})
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"]}
