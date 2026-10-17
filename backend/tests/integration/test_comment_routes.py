import pytest 


class TestAddComment:

    def test_add_commnet_success_returns_201(self, client, test_post, auth_header):
        post_id = test_post["_id"]
        resp = client.post(
            f"/comment/{post_id}",
            json={"value": "Great post!"},
            headers=auth_header,
        )

        assert resp.status_code == 201

    def test_add_commnet_updated_post(self, client, test_post, auth_header):
        post_id = test_post["_id"]
        resp = client.post(
            f"/comment/{post_id}",
            json={"value": "Great post!"},
            headers=auth_header,
        )

        data = resp.get_json()
        assert "data" in data 
        assert isinstance(data["data"]["comments"], list)
     

    def test_commnet_appears_in_post_comments(self, client, test_post, auth_header, clean_db):
        post_id = test_post["_id"]
        resp = client.post(
            f"/comment/{post_id}",
            json={"value": "Awesome!"},
            headers=auth_header,
        )

        comment = clean_db.comments.find_one({"postId": post_id, "value": "Awesome!"})
        assert comment is not None

    def test_commnet_without_auth_returns_401(self, client, test_post):
        post_id = test_post["_id"]
        resp = client.post(
            f"/comment/{post_id}",
            json={"value": "Awesome!"}        )

        assert resp.status_code == 401

    def test_commnet_to_nonexistent_post_returns_404(self, client, registerd_user, auth_header):
        resp = client.post(
            "/comment/000000000000000000000000",
            json={"value": "On Nothing!"},
            headers=auth_header,
        )

        data = resp.get_json()
        print(f"hello {data}")
        assert resp.status_code == 404


    def test_add_multiple_commnets_all_appears(self, client, test_post, auth_header, clean_db):
        post_id = test_post["_id"]
        client.post(
            f"/comment/{post_id}",
            json={"value": "First!"},
            headers=auth_header,
        )

        client.post(
            f"/comment/{post_id}",
            json={"value": "Second!"},
            headers=auth_header,
        )
        count = clean_db.comments.count_documents({"postId": post_id})
        assert count >=2