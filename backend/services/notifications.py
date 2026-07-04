import httpx

async def send_push_notification(expo_token: str, title: str, body: str, data: dict = None):
    url = "https://exp.host/--/api/v2/push/send"
    payload = {
        "to": expo_token,
        "title": title,
        "body": body,
        "data": data or {}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            return response.json()
        except Exception as e:
            print(f"Failed to send notification: {e}")
            return None
