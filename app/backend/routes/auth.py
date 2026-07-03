from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime
from typing import Optional
from app.backend.schemas.base import UserCreate, UserBase
from app.backend.services.auth import get_password_hash, verify_password, create_access_token
from app.backend.services.google_auth import verify_google_token
from app.backend.database.mongodb import users_collection
import uuid

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    # Check if user exists
    if await users_collection.find_one({"$or": [{"username": user.username}, {"email": user.email}]}):
        raise HTTPException(status_code=400, detail="Username or Email already registered")

    user_dict = user.dict()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    user_dict["_id"] = str(uuid.uuid4())
    user_dict["hardware_id"] = None
    user_dict["is_hardware_bound"] = False
    user_dict["first_login_done"] = False
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()

    await users_collection.insert_one(user_dict)
    return {"message": "User registered successfully"}

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    hardware_id: Optional[str] = None
):
    user = await users_collection.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Device Binding Logic
    if user["role"] == "pekerja":
        if not hardware_id:
            raise HTTPException(status_code=400, detail="Hardware ID is required for pekerja")

        if not user.get("is_hardware_bound"):
            # First time login for pekerja, bind the device
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"hardware_id": hardware_id, "is_hardware_bound": True, "updated_at": datetime.utcnow()}}
            )
        else:
            # Check if hardware_id matches
            if user.get("hardware_id") != hardware_id:
                raise HTTPException(status_code=403, detail="Account bound to another device")

    # Force Password Change for Admin on first login
    force_password_change = False
    if user["username"] == "administrator" and not user.get("first_login_done"):
        force_password_change = True

    access_token = create_access_token(data={"sub": user["username"], "role": user["role"], "user_id": user["_id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "force_password_change": force_password_change
    }

@router.post("/google-login")
async def google_login(token: str, hardware_id: Optional[str] = None):
    google_data = await verify_google_token(token)
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
            "password_hash": None,
            "google_id": google_data["sub"],
            "hardware_id": None,
            "is_hardware_bound": False,
            "first_login_done": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(user)

    # Apply Hardware Binding for Google Auth too
    if user["role"] == "pekerja":
        if not hardware_id:
            raise HTTPException(status_code=400, detail="Hardware ID is required for pekerja")

        if not user.get("is_hardware_bound"):
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"hardware_id": hardware_id, "is_hardware_bound": True, "updated_at": datetime.utcnow()}}
            )
        elif user.get("hardware_id") != hardware_id:
            raise HTTPException(status_code=403, detail="Account bound to another device")

    access_token = create_access_token(data={"sub": user["username"], "role": user["role"], "user_id": user["_id"]})
    return {"access_token": access_token, "token_type": "bearer"}
