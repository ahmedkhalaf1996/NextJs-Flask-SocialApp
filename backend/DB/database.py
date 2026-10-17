import pymongo

class DataBase():
    def connect():
        try:
            mongo = pymongo.MongoClient(
                host="localhost",
                port=27017,
                serverSelectionTimeoutMS=1000
            )
        except:
            print("Error connecting to MongoDB")

        return mongo.social 
    