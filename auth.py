import os
import time
import requests
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from fastapi import HTTPException, Header

COGNITO_REGION = os.getenv("COGNITO_REGION")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"

_JWKS_CACHE = {"keys": None, "fetched_at": 0}
_JWKS_TTL = 60 * 60  # 1 hour

def _get_jwks():
    now = time.time()
    if _JWKS_CACHE["keys"] and (now - _JWKS_CACHE["fetched_at"]) < _JWKS_TTL:
        return _JWKS_CACHE["keys"]

    r = requests.get(JWKS_URL, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch Cognito JWKS")

    data = r.json()
    keys = data.get("keys")
    if not keys:
        raise HTTPException(status_code=500, detail="Invalid JWKS response from Cognito")

    _JWKS_CACHE["keys"] = keys
    _JWKS_CACHE["fetched_at"] = now
    return keys

def _get_public_key(token: str):
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Invalid token header (missing kid)")

    for k in _get_jwks():
        if k.get("kid") == kid:
            return k

    raise HTTPException(status_code=401, detail="Invalid token (kid not found)")

def get_current_user(authorization: str = Header(None)):
    # env sanity
    if not (COGNITO_REGION and COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID):
        raise HTTPException(status_code=500, detail="Cognito env vars missing")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    key = _get_public_key(token)

    # Read token_use without verifying (only to choose validation logic)
    try:
        unverified = jwt.get_unverified_claims(token)
        token_use = unverified.get("token_use")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token (cannot read claims)")

    try:
        # Verify signature + issuer (no audience here)
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=ISSUER,
            options={
                "verify_aud": False,
                "verify_at_hash": False
            }
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token signature/claims: {str(e)}")

    # Now enforce client/app matching depending on token type
    if token_use == "id":
        aud = payload.get("aud")
        if aud != COGNITO_APP_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Invalid token (aud mismatch)")
    elif token_use == "access":
        client_id = payload.get("client_id")
        if client_id != COGNITO_APP_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Invalid token (client_id mismatch)")
    else:
        raise HTTPException(status_code=401, detail="Invalid token_use")

    return {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "username": payload.get("cognito:username") or payload.get("username"),
    }