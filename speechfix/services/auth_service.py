from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from speechfix.models.db_models import User
from speechfix.schemas.db_schema import UserCreate, UserLogin

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password for storage"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_user(db: Session, user: UserCreate) -> User:
    """
    Create a new user in the database
    Raises HTTPException if email already exists
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user with hashed password
    hashed_pwd = hash_password(user.password)
    db_user = UserCreate(
        full_name=user.full_name, email=user.email, password=hashed_pwd
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


def authenticate_user(db: Session, login: UserLogin) -> User:
    """
    Authenticate user by email and password
    Raises HTTPException if credentials are invalid
    """
    # Find user by email (username field contains email)
    user = db.query(User).filter(User.email == login.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(login.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    return user
