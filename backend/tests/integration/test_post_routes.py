"""
Integration tests for post-related API routes.

Routes under test:
  POST   /posts          — create a post (requires auth)
  GET    /posts          — get feed posts (requires ?page and ?id)
  GET    /posts/<id>     — get single post
  PATCH  /posts/<id>     — update post (requires auth)
  DELETE /posts/<id>     — delete post (requires auth)
  PATCH  /posts/<id>/likePost — like/unlike a post (requires auth)
  GET    /posts/search   — search posts and users
"""

import pytest 

class TestCreatePost:

    def test_create_post_success_returns_201(self, client, registerd_user, auth_header):
        resp = client.post(
            "/posts",
            json={
                "title": "Test Post",
                "message": "This is a test post.",
                "selectedFile": ""
            },
            headers=auth_header
        )
        assert resp.status_code == 201

    def test_create_post_returns_result(self, client, registerd_user, auth_header):
        resp = client.post(
            "/posts",
            json={
                "title": "Test Post",
                "message": "This is a test post.",
                "selectedFile": ""
            },
            headers=auth_header
        )
        data = resp.get_json()
        assert "result" in data
        assert data["result"]["title"] == "Test Post"
        assert data["result"]["message"] == "This is a test post."

    def test_create_post_without_auth_returns_401(self, client, registerd_user):
        resp = client.post(
            "/posts",
            json={
                "title": "Test Post",
                "message": "This is a test post.",
                "selectedFile": ""
            }
        )
        assert resp.status_code == 401

    def test_create_post_sets_creator_from_token(self, client, registerd_user, auth_header):
        resp = client.post(
            "/posts",
            json={
                "title": "Test Post",
                "message": "This is a test post.",
                "selectedFile": ""
            },
            headers=auth_header
        )
        data = resp.get_json()
        assert data["result"]["creator"] == registerd_user["user"]["_id"]


class TestGetPosts:

    def test_get_post_by_id_success_returns_200(self, client, test_post):
        post_id = test_post["_id"]
        resp = client.get(f"/posts/{post_id}")
        assert resp.status_code == 200

    def test_get_post_by_id_returns_post_data(self, client, test_post):
        post_id = test_post["_id"]
        resp = client.get(f"/posts/{post_id}")
        data = resp.get_json()
        assert "post" in data
        assert data["post"]["_id"] == post_id

    def test_get_nonexistent_post_returns_404(self, client):
        resp = client.get("/posts/000000000000000000000000000") 
        assert resp.status_code == 404


class TestGetFeedPosts:
    def test_get_posts_returns_200(self, client, test_post, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/posts?page=1&id={user_id}")
        assert resp.status_code == 200

    def test_get_posts_retruns_data_key(self, client, test_post, registerd_user):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/posts?page=1&id={user_id}")
        data = resp.get_json()
        assert "data" in data 
        assert isinstance(data["data"], list)

class TestUpdatePost:

    def test_update_post_sucess_returns_200(self, client, test_post, auth_header):
        post_id = test_post["_id"]
        resp = client.patch(
            f"/posts/{post_id}",
            json={
                "title": "Updated Title",
                "message": "Updated message.",
                "selectedFile": "",
            },
            headers=auth_header,
        )

        assert resp.status_code == 200

    def test_updae_post_reflacts_new_title(self, client, test_post, auth_header):
        post_id = test_post["_id"]
        resp = client.patch(
            f"/posts/{post_id}",
            json={
                "title": "New Title Here",
                "message": "Some message.",
                "selectedFile": "",
            },
            headers=auth_header,
        )

        data = resp.get_json()
        assert data["data"]["title"] == "New Title Here"

    def test_update_post_without_auth_returns_401(self, client, test_post):
        post_id = test_post["_id"]
        resp = client.patch(
            f"/posts/{post_id}",
            json={
                "title": "New Title Here",
                "message": "Some message.",
                "selectedFile": "",
            },
        )

        assert resp.status_code == 401

class TestDeletePost:

    def test_delete_post_success_returns_200(self, client, test_post, auth_header ):
        post_id = test_post["_id"]
        resp = client.delete(f"/posts/{post_id}", headers=auth_header)
        assert resp.status_code == 200

    def test_delete_post_witout_auth_returns_401(self, client, test_post ):
        post_id = test_post["_id"]
        resp = client.delete(f"/posts/{post_id}")
        assert resp.status_code == 401

    def test_delete_post_not_found(self, client, test_post, auth_header ):
        post_id = test_post["_id"]
        client.delete(f"/posts/{post_id}", headers=auth_header)
        resp = client.get(f"/posts/{post_id}")
        assert resp.status_code == 404

class TestLikePost:

    def test_like_post_returns_200(self, client, test_post, auth_header ):
        post_id = test_post["_id"]
        resp = client.patch(f"/posts/{post_id}/likePost", headers=auth_header)
        assert resp.status_code == 200
    
    def test_like_post_adds_user_to_likes(self, client, test_post, auth_header, registerd_user ):
        post_id = test_post["_id"]
        resp = client.patch(f"/posts/{post_id}/likePost", headers=auth_header)
        data = resp.get_json()

        assert registerd_user["user"]["_id"] in data["post"]["likes"]

    def test_unlike_post_removes_user_to_likes(self, client, test_post, auth_header, registerd_user ):
        post_id = test_post["_id"]
        # first like 
        resp = client.patch(f"/posts/{post_id}/likePost", headers=auth_header)
        # second like = unlike 
        resp = client.patch(f"/posts/{post_id}/likePost", headers=auth_header)

        data = resp.get_json()

        assert registerd_user["user"]["_id"] not in data["post"]["likes"]
    
    def test_like_post_without_auth_returns_401(self, client, test_post ):
        post_id = test_post["_id"]
        resp = client.patch(f"/posts/{post_id}/likePost")
        assert resp.status_code == 401

class TestSearchPosts:

    def test_search_returns_200(self, client, test_post, registerd_user ):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/posts/search?searchQuery=Test&id={user_id}")
        assert resp.status_code == 200

    def test_search_returns_posts_key(self, client, test_post, registerd_user ):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/posts/search?searchQuery=Test&id={user_id}")
        data = resp.get_json()
        assert "posts" in data
        assert isinstance(data["posts"], list)

    def test_search_finds_matching_post(self, client, test_post, registerd_user ):
        user_id = registerd_user["user"]["_id"]
        resp = client.get(f"/posts/search?searchQuery=Test+Post+Title&id={user_id}")
        data = resp.get_json()
        assert len(data["posts"]) >= 1