from fastapi import APIRouter, Depends, UploadFile, File
from routes.deps import get_current_user
import uuid
import os

router = APIRouter()

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-proof")
async def upload_proof(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return {"url": f"/static/uploads/{file_name}"}
