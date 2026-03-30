from pydantic import BaseModel, EmailStr
from typing import Optional, List

# USER SCHEMAS


class UserCreate(BaseModel):
    """Schema for user registration"""

    full_name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """Schema for user login"""

    username: EmailStr  # HTMX form sends 'username' field
    password: str


class UserResponse(BaseModel):
    """Schema for returning user data"""

    id: int
    email: str
    full_name: str

    class Config:
        from_attributes = True


# QUESTION SCHEMAS


class QuestionCreate(BaseModel):
    """Schema for creating a question"""

    text: str
    hint: Optional[str] = None
    topic_label: str
    difficulty_label: str


class QuestionResponse(BaseModel):
    """Schema for returning question data"""

    id: int
    text: str
    hint: Optional[str] = None
    topic_label: str
    difficulty_label: str
    owner_id: int

    class Config:
        from_attributes = True


class UserWithQuestions(BaseModel):
    """Schema for user with their saved questions"""

    id: int
    email: str
    full_name: str
    questions: List[QuestionResponse]

    class Config:
        from_attributes = True


# RESPONSE SCHEMAS


class LoginResponse(BaseModel):
    """Response after successful login"""

    message: str
    user: UserResponse
    redirect_url: str = "/index.html"
