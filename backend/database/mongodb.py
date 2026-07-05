import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/absenlah")
DB_NAME = os.getenv("DB_NAME", "absenlah")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def serializable(doc):
    if not doc: return doc
    if isinstance(doc, list):
        return [serializable(d) for d in doc]

    new_doc = {}
    for k, v in doc.items():
        if k == "_id":
            new_doc["_id"] = str(v)
        elif hasattr(v, "isoformat"): # Date/Datetime
            new_doc[k] = v.isoformat()
        else:
            new_doc[k] = v
    return new_doc

async def get_database():
    return db

# Collections
users_collection = db.users
divisions_collection = db.divisions
geofences_collection = db.geofences
config_rules_collection = db.config_rules
attendance_logs_collection = db.attendance_logs
leave_requests_collection = db.leave_requests
user_stats_collection = db.user_stats
