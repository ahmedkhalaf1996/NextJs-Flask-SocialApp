import sys
import os
import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(os.path.abspath(__file__))))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from pydantic import ValidationError
from models.users_model import User 
from models.posts_model import Post
from models.comment_model import Comment
from models.notification_model import Notification

class TestUserModel:

    def test_valid_user_constrauction(self):
        user = User(name="Alice Smith", email="alice@example.com", password="hashed_pw")
        assert user.name == "Alice Smith"
        assert user.email == "alice@example.com"
        assert user.password == "hashed_pw"

    def test_defult_bio_is_empty_string(self):
        user = User(name="Bob Johnson", email="bob@example.com", password="hashed_pw")
        assert user.bio == ""

    def test_defult_imageUrl_is_empty_string(self):
        user = User(name="Charlie Brown", email="charlie@example.com", password="hashed_pw")
        assert user.imageUrl == ""

    def test_defult_followers_is_empty_list(self):
        user = User(name="David Lee", email="david@example.com", password="hashed_pw")
        assert user.followers == []

    def test_defult_following_is_empty_list(self):
        user = User(name="Eva Green", email="eva@example.com", password="hashed_pw")
        assert user.following == []

    def test_missing_name_raises_validation_error(self):
        with pytest.raises(ValidationError):
            User(email="bob@example.com", password="hashed_pw")

    def test_missing_email_raises_validation_error(self):
        with pytest.raises(ValidationError):
            User(name="Bob Johnson", password="hashed_pw")

    def test_missing_password_raises_validation_error(self):
        with pytest.raises(ValidationError):
            User(name="Bob Johnson", email="bob@example.com")

    def test_optional_bio_can_be_set(self):
        user = User(name="Frank White", email="frank@example.com", password="hashed_pw", bio="A passionate developer.")
        assert user.bio == "A passionate developer."

    def test_user_serializes_to_dict(self):
        user = User(name="Grace Hopper", email="grace@example.com", password="hashed_pw")
        d = dict(user)
        assert "name" in d
        assert "email" in d
        assert "password" in d

    # testpost
class TestPostModel:
    def test_valid_post_construction(self):
        post = Post(
            title="My First Post",
            message="This is the content of my first post.",
            creator="user123",
            selectedFile="path/to/image.jpg",
            name="Alice Smith")
        
        assert post.title == "My First Post"
        assert post.message == "This is the content of my first post."
        assert post.creator == "user123"
        assert post.selectedFile == "path/to/image.jpg"

    def test_likes_default_to_empty_list(self):
        post = Post(
            title="T", message="M", creator="user123", selectedFile="path/to/image.jpg", name="Alice Smith"
        )
        assert post.likes == []
    def test_missing_title_raises_validation_error(self):
        with pytest.raises(ValidationError):
            Post(message="M", creator="user123", selectedFile="path/to/image.jpg", name="Alice Smith")
    def  test_post_has_created_at(self):
        post = Post(
            title="T", message="M", creator="user123", selectedFile="", name="Alice Smith"
        )
        assert post.createdAt is not None
        
    # test commnet 
class TestCommentModel:
    def test_valid_comment_construction(self):
        comment = Comment(
            postId="post123",
            creator="user123",
            value="This is a comment."
        )
        assert comment.postId == "post123"
        assert comment.creator == "user123"
        assert comment.value == "This is a comment."
    def test_missing_value_raises_validation_error(self):
        with pytest.raises(ValidationError):
            Comment(postId="post123", creator="user123")
    # test notiifcation 

class TestNotificationModel:
    def test_valid_notification_construction(self):
        notification = Notification(
            deatils="You have a new follower.",
            mainuid="notif123",
            targetid="user456",
            userid="user123",
        )
        assert notification.deatils == "You have a new follower."
        assert notification.mainuid == "notif123"
        assert notification.targetid == "user456"
        assert notification.userid == "user123"

    def test_missing_required_fields_raises_validation_error(self):
        with pytest.raises(ValidationError):
            Notification(mainuid="notif123", targetid="user456", userid="user123")
