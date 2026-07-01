import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# dev fallback, set BOOKER_SECRET_KEY in a real deployment
SECRET_KEY = os.environ.get("BOOKER_SECRET_KEY", "booker-dev-secret")
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 24

ph = PasswordHasher()


def hash_password(password: str):
    return ph.hash(password)


def verify_password(plain: str, hashed: str):
    try:
        return ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def create_token(username: str):
    payload = {"sub": username, "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
