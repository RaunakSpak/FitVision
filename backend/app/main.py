from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import auth, workouts
from app.core.config import get_cors_origins, settings

app = FastAPI(title="FitVision AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = err.get("loc", ())
        field = loc[-1] if loc else "field"
        msg = err.get("msg", "Invalid value")
        if "email" in str(field).lower():
            messages.append("Enter a valid email address")
        elif "password" in str(field).lower() and "at least" in msg.lower():
            messages.append("Password must be at least 8 characters")
        else:
            messages.append(msg)
    return JSONResponse(
        status_code=422,
        content={"detail": messages[0] if len(messages) == 1 else ", ".join(messages)},
    )


app.include_router(auth.router, prefix="/api")
app.include_router(workouts.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "FitVision AI API"}
