import httpx
from fastapi import HTTPException

async def verify_google_token(token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={token}")
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        return response.json()
