from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from speechfix.core.database import get_db
from speechfix.schemas.db_schema import UserCreate, UserLogin, UserResponse
from speechfix.services.auth_service import create_user, authenticate_user
from fastapi import Form

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    """Register a new user - HTMX endpoint"""
    try:
        user_data = UserCreate(full_name=full_name, email=email, password=password)
        user = create_user(db, user_data)

        # Return success message with redirect (HTMX compatible)
        return HTMLResponse(
            content=f"""
            <div class="text-success" style="font-size: 0.9rem; text-align: center;">
                Account created successfully for {user.full_name or user.email}! Redirecting...
            </div>
            <script>
                setTimeout(() => {{
                    window.location.href = '/index';
                }}, 1500);
            </script>
            """,
            status_code=200,
        )
    except HTTPException as e:
        return HTMLResponse(
            content=f'<div class="text-danger">{e.detail}</div>',
            status_code=e.status_code,
        )
    except Exception as e:
        return HTMLResponse(
            content=f'<div class="text-danger">Registration failed: {str(e)}</div>',
            status_code=400,
        )


@router.post("/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    """Login user - HTMX endpoint"""
    try:
        login_data = UserLogin(username=username, password=password)
        user = authenticate_user(db, login_data)

        # Return success message with redirect (HTMX compatible)
        return HTMLResponse(
            content=f"""
            <div class="text-success" style="font-size: 0.9rem; text-align: center;">
                Login successful! Welcome back, {user.full_name or user.email}. Redirecting...
            </div>
            <script>
                setTimeout(() => {{
                    window.location.href = '/index';
                }}, 1500);
            </script>
            """,
            status_code=200,
        )
    except HTTPException as e:
        return HTMLResponse(
            content=f'<div class="text-danger">{e.detail}</div>',
            status_code=e.status_code,
        )
    except Exception as e:
        return HTMLResponse(
            content=f'<div class="text-danger">Login failed: {str(e)}</div>',
            status_code=400,
        )


# jwt
@router.get("/me", response_model=UserResponse)
async def get_current_user(db: Session = Depends(get_db)):
    """Get current user info (requires auth token in future)"""
    # This is a placeholder - implement token-based auth later
    pass
