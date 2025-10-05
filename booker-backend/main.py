from fastapi import FastAPI
from constants import DATABASE_URL

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/ping")
async def ping():
    return {"message": "Hello"}

# you can view someone's list but only owner can edit
@app.get("/booklist")
async def booklist():
    return {"message": "booklist"}
