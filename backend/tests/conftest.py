import sys
import os 
import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


import mongomock
from unittest.mock import patch

_shared_mongo_client = mongomock.MongoClient()

def _get_shared_client(*args, **kwargs):
    return _shared_mongo_client

_mongo_patcher = patch('pymongo.MongoClient', side_effect=_get_shared_client)
_mongo_patcher.start()


from app import app as flask_app

from services.postService import PostService

def _simple_pipeline(match_condition):
    return [
        {"$match": match_condition},
        {"$addFields": {"comments": []}},
    ]

PostService._aggreate_post_pipeline = staticmethod(_simple_pipeline)

# fixtures

@pytest.fixture(scope='session')
def app():
    flask_app.config.update({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
    })
    yield flask_app


@pytest.fixture(scope='session')
def client(app):
    return app.test_client() 

@pytest.fixture(scope='session')
def mongo_db():
    return _shared_mongo_client.social 

@pytest.fixture
def clean_db(mongo_db):
    for coll in ["users", "posts", "comments", "notifications", "messages", "unreadedmsg"]:
        mongo_db[coll].drop()
    yield mongo_db
    for coll in ["users", "posts", "comments", "notifications", "messages", "unreadedmsg"]:
        mongo_db[coll].drop()

@pytest.fixture
def registerd_user(client, clean_db):
    payload = {
        "firstName": "Test",
        "lastName": "User",
        "email": "testuser@example.com",
        "password": "StrongPass123!",
    }
    resp = client.post(
        "/user/signup",
        json=payload,
        content_type="application/json"
    )

    assert resp.status_code == 201, f"Setup failed signup returned {resp.status_code}: {resp.data}"
    data = resp.get_json()
    return {
        "token": data["token"],
        "user": data["result"]
    }


@pytest.fixture
def auth_header(registerd_user):
    return {"Authorization": f"Bearer {registerd_user['token']}"}

@pytest.fixture
def test_post(client, registerd_user, auth_header):
    resp = client.post(
        "/posts",
        json={
            "title": "Test Post Title",
            "message": "This is a test post message.",
            "selectedFile": ""
        },
        headers=auth_header,
        content_type="application/json"
    )
    assert resp.status_code == 201, f"Setup failed post creation returned {resp.status_code}: {resp.data}"
    return resp.get_json()["result"]