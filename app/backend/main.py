from fastapi import FastAPI
from app.backend.routes import auth, attendance, supervisor, leaves, admin

app = FastAPI(title="Absenlah API")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Absenlah API"}

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(supervisor.router, prefix="/supervisor", tags=["Supervisor"])
app.include_router(leaves.router, prefix="/leaves", tags=["Leaves"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
