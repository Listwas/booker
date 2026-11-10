import os
import hmac
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


def _auth_stamp(hashed_password: str):
    return hmac.new(SECRET_KEY.encode(), hashed_password.encode(), "sha256").hexdigest()


def create_token(user_id: int, hashed_password: str):
    payload = {
        "sub": str(user_id),
        "auth": _auth_stamp(hashed_password),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def token_matches_user(payload: dict, user_id: int, hashed_password: str):
    stamp = payload.get("auth")
    return (
        payload.get("sub") == str(user_id)
        and isinstance(stamp, str)
        and hmac.compare_digest(stamp.encode(), _auth_stamp(hashed_password).encode())
    )


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM],
                          options={"require_sub": True, "require_exp": True})
    except JWTError:
        return None
