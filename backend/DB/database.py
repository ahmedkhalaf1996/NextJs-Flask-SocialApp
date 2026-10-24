import pymongo
import os
class DataBase():
    def connect():
        try:
            mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
            mongo = pymongo.MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=1000
            )
        except:
            print("Error connecting to MongoDB")

        return mongo.social 
    