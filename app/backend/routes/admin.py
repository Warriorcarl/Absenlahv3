from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError
from app.backend.services.auth import SECRET_KEY, ALGORITHM
from app.backend.database.mongodb import users_collection
from app.backend.routes.auth import oauth2_scheme
from datetime import datetime

router = APIRouter()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await users_collection.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

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
