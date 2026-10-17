
"""
routesw under test:
    POST /user/signup
    POST /user/signin
    GET /user/getUser 
    PATCH /user/Update/<id>
    PATCH /user/<id>/following
    GET /user/getSug 
"""
import json
import pytest

class TestUserSignup:

    def test_signup_sucess_returns_201(self, client, clean_db):
        resp = client.post(
            "/user/signup",
            json={
                "firstName": "testuser",
                "lastName": "testuser",
                "email": "testuser@example.com",
                "password": "testpassword"
            }
        )
        assert resp.status_code == 201
    
    def test_signup_returns_token(self, client, clean_db):
        resp = client.post(
            "/user/signup",
            json={
                "firstName": "testuser",
                "lastName": "testuser",
                "email": "testuser@example.com",
                "password": "testpassword"
            }
        )
        data = resp.get_json()
        assert "token" in data
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0

    def test_signup_returns_user_without_password(self, client, clean_db):
        resp = client.post(
            "/user/signup",
            json={
                "firstName": "testuser",
                "lastName": "testuser",
                "email": "testuser@example.com",
                "password": "testpassword"
            }
        )
        data = resp.get_json()
        assert "result" in data
        user = data["result"]
        assert "password" not in user
        assert "_id" in user 
        assert user["email"] =="testuser@example.com"

    def test_signup_user_name_concatenats_first_last(self, client, clean_db):
        resp = client.post(
            "/user/signup",
            json={
                "firstName": "Bob",
                "lastName": "Builder",
                "email": "testuser@example.com",
                "password": "testpassword"
            }
        )
        data = resp.get_json()
        assert data["result"]["name"] == "Bob Builder"


class TestUserSignin:

    def test_signin_success_returns_200(self, client,registerd_user):
        resp =client.post(
            "/user/signin",
            json={
                "email": "testuser@example.com",
                "password": "StrongPass123!",
            }
        )
        assert resp.status_code == 200
    def test_signin_returns_token(self, client, registerd_user):
        resp = client.post(
            "/user/signin",
            json={
                "email": "testuser@example.com",
                "password": "StrongPass123!",
            }
        )
        data = resp.get_json()
        assert "token" in data
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0

    def test_signin_wrong_password_returns_401(self, client, registerd_user):
        resp = client.post(
            "/user/signin",
            json={
                "email": "testuser@example.com",
                "password": "WrongPassword123!",
            }
        )
        assert resp.status_code == 401

    def test_signin_nonexistent_user_returns_401(self, client):
        resp = client.post(
            "/user/signin",
            json={
                "email": "nonexistent@example.com",
                "password": "anyPassword123!",
            }
        )
        assert resp.status_code == 401

class TestGetUser:

    def test_get_user_success_returns_200(self, client, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/user/getUser?userid={user_id}&withPosts=false")
        assert resp.status_code == 200

    def test_get_user_returns_object(self, client, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/user/getUser?userid={user_id}&withPosts=false")
        data = resp.get_json()
        assert "user" in data
        assert data["user"]["_id"] == user_id

    def test_get_user_no_userid_returns_400(self, client):
        resp = client.get("/user/getUser")
        assert resp.status_code == 400

    def test_get_user_invalid_id_returns_404(self, client):
        resp = client.get("/user/getUser?userid=invalid_id&withPosts=false")
        assert resp.status_code == 404

    def test_get_user_does_not_expose_password(self, client, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/user/getUser?userid={user_id}&withPosts=false")
        data = resp.get_json()
        assert "password" not in data["user"]

class TestUpdateUser:

    def test_update_user_sucess_returns_200(self, client, registerd_user, auth_header):
        user_id = registerd_user["user"]["_id"]
        resp = client.patch(
            f"/user/Update/{user_id}",
            json={
                "name": "updatedName",
                "bio": "UpdatedBio",
                "imageUrl": "",
            },
            headers=auth_header
        )
        assert resp.status_code == 200

    def test_update_user_without_token_returns_401(self, client, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.patch(
            f"/user/Update/{user_id}",
            json={
                "name": "UpdatedName",
                "bio": "UpdatedBio",
                "imageUrl": ""
            }
        )
        assert resp.status_code == 401

    def test_update_user_diffrent_user_returns_403(self, client, registerd_user, auth_header):
        resp2 = client.post(
            "/user/signup",
            json={
                "firstName": "Another User",
                "lastName": "User",
                "email": "anotheruser@example.com",
                "password": "AnotherPassword123!"
            }
        )
        print("Second user signup response:", resp2.get_json())
        second_id = resp2.get_json()["result"]["_id"]

        # Try to update the first user with the second user's token
        resp = client.patch(
            f"/user/Update/{second_id}",
            json={
                "name": "UpdatedName",
                "bio": "UpdatedBio",
                "imageUrl": ""
            },
            headers=auth_header
        )
        assert resp.status_code == 403  

class TestGetSuggestions:

    def test_get_suggestions_success_returns_200(self, client, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/user/getSug?id={user_id}")
        assert resp.status_code == 200

    def test_get_suggestions_returns_users_key(self, client, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/user/getSug?id={user_id}")
        data = resp.get_json()
        assert "users" in data
        assert isinstance(data["users"], list)