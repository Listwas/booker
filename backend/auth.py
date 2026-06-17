from datetime import datetime, timedelta
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# read from env in a real deployment
SECRET_KEY = "booker-secret-change-later"
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
    payload = {"sub": username, "exp": datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None