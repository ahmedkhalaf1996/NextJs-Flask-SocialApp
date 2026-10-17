import sys 
import os 
import time
import jwt 
import pytest


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(os.path.abspath(__file__))))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from auth.auth_handler import signJWT, decodeJWT, JWT_SECRET, JWT_ALGORITHM


class TestSignJWT:

    def test_returns_dict_with_access_token(self):
        result = signJWT("user123")
        assert isinstance(result, dict)
        assert "access_token" in result

    def test_access_token_is_a_string(self):
        result = signJWT("user123")
        assert isinstance(result["access_token"], str)

    def test_token_contains_user_id(self):
        user_id = "user123"
        result = signJWT(user_id)
        payload = jwt.decode(result["access_token"], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert payload["user_id"] == user_id

    def test_token_has_future_expiry(self):
        result = signJWT("user123")
        payload = jwt.decode(result["access_token"], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert payload["expires"] > time.time()

    def test_different_users_get_different_tokens(self):
        token_a = signJWT("user123")["access_token"]
        token_b = signJWT("user456")["access_token"]
        assert token_a != token_b

class TestDecodeJWT:

    def test_decodes_valid_token(self):
        token = signJWT("user_xyz")["access_token"]
        result = decodeJWT(token)
        assert result is not None
        assert result["user_id"] == "user_xyz"

    def test_returns_empty_dict_for_invalid_token(self):
        result = decodeJWT("invalid.token.here")
        assert result == {}
    def test_returns_none_for_expired_token(self):
        expired_payload = {
            "user_id": "user_expired",
            "expires": time.time() - 1  # Set expiry to the past
        }
        expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        result = decodeJWT(expired_token)
        assert result is None

    def test_returns_empty_dict_for_wrong_secret(self):
        wrong_token = jwt.encode(
            {"user_id": "user_wrong_secret", "expires": time.time() + 86400},
            "wrongsecret",
            algorithm=JWT_ALGORITHM,
        )
        result = decodeJWT(wrong_token)
        assert result == {}