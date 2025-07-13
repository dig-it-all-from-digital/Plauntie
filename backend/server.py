from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import aiohttp
import asyncio
import json
import base64
from PIL import Image
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Plant Care Assistant API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# API Keys
PERENUAL_API_KEY = os.environ.get('PERENUAL_API_KEY')
PLANTNET_API_KEY = os.environ.get('PLANTNET_API_KEY')
PLANTBOOK_CLIENT_ID = os.environ.get('PLANTBOOK_CLIENT_ID')
PLANTBOOK_CLIENT_SECRET = os.environ.get('PLANTBOOK_CLIENT_SECRET')
PLANTBOOK_API_TOKEN = os.environ.get('PLANTBOOK_API_TOKEN')
KINDWISE_API_KEY = os.environ.get('KINDWISE_API_KEY')
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY')

# Models
class PlantSearchResult(BaseModel):
    id: str
    name: str
    scientific_name: str
    common_names: List[str] = []
    image_url: Optional[str] = None
    description: Optional[str] = None
    care_level: Optional[str] = None

class PlantCareInfo(BaseModel):
    plant_id: str
    name: str
    scientific_name: str
    watering: Optional[str] = None
    sunlight: Optional[str] = None
    temperature: Optional[str] = None
    humidity: Optional[str] = None
    fertilizer: Optional[str] = None
    repotting: Optional[str] = None
    common_problems: List[str] = []
    care_tips: List[str] = []

class PlantIdentification(BaseModel):
    suggestions: List[Dict[str, Any]] = []
    confidence: float = 0.0
    identified_name: Optional[str] = None

class UserPlant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plant_id: str
    nickname: str
    plant_name: str
    scientific_name: str
    date_added: datetime = Field(default_factory=datetime.utcnow)
    last_watered: Optional[datetime] = None
    last_fertilized: Optional[datetime] = None
    last_repotted: Optional[datetime] = None
    watering_frequency_days: int = 7
    fertilizing_frequency_days: int = 30
    notes: Optional[str] = None
    image_url: Optional[str] = None

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plant_id: str
    plant_nickname: str
    reminder_type: str  # watering, fertilizing, repotting
    due_date: datetime
    completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlantDiagnosis(BaseModel):
    plant_name: Optional[str] = None
    health_status: str
    problems: List[Dict[str, Any]] = []
    recommendations: List[str] = []
    confidence: float = 0.0

# Plant API Integration Services
class PlantAPIService:
    def __init__(self):
        self.session = None
    
    async def get_session(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close_session(self):
        if self.session:
            await self.session.close()

    async def search_plants_perenual(self, query: str) -> List[PlantSearchResult]:
        """Search plants using Perenual API"""
        session = await self.get_session()
        url = f"https://perenual.com/api/species-list"
        params = {
            'key': PERENUAL_API_KEY,
            'q': query,
            'page': 1
        }
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for plant in data.get('data', []):
                        result = PlantSearchResult(
                            id=str(plant.get('id', '')),
                            name=plant.get('common_name', ''),
                            scientific_name=plant.get('scientific_name', [''])[0] if plant.get('scientific_name') else '',
                            common_names=plant.get('other_name', []),
                            image_url=plant.get('default_image', {}).get('medium_url') if plant.get('default_image') else None,
                            description=plant.get('description', ''),
                            care_level=plant.get('care_level', '')
                        )
                        results.append(result)
                    
                    return results
        except Exception as e:
            logging.error(f"Error searching Perenual: {e}")
        
        return []

    async def get_plant_care_info_perenual(self, plant_id: str) -> Optional[PlantCareInfo]:
        """Get detailed care information from Perenual API"""
        session = await self.get_session()
        url = f"https://perenual.com/api/species/details/{plant_id}"
        params = {'key': PERENUAL_API_KEY}
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    care_info = PlantCareInfo(
                        plant_id=plant_id,
                        name=data.get('common_name', ''),
                        scientific_name=data.get('scientific_name', [''])[0] if data.get('scientific_name') else '',
                        watering=data.get('watering', ''),
                        sunlight=data.get('sunlight', [''])[0] if data.get('sunlight') else '',
                        temperature=f"{data.get('hardiness', {}).get('min', '')} - {data.get('hardiness', {}).get('max', '')}°C",
                        humidity=data.get('humidity', ''),
                        fertilizer=data.get('fertilizer', ''),
                        repotting=data.get('repotting', ''),
                        common_problems=data.get('problem', []),
                        care_tips=data.get('care_guides', [])
                    )
                    
                    return care_info
        except Exception as e:
            logging.error(f"Error getting care info from Perenual: {e}")
        
        return None

    async def identify_plant_plantnet(self, image_data: bytes) -> PlantIdentification:
        """Identify plant using PlantNet API"""
        session = await self.get_session()
        url = "https://my-api.plantnet.org/v2/identify/weurope"
        
        # Prepare the image data
        image_b64 = base64.b64encode(image_data).decode()
        
        data = aiohttp.FormData()
        data.add_field('images', image_data, filename='plant.jpg', content_type='image/jpeg')
        data.add_field('modifiers', '["crops","isolated"]')
        data.add_field('plant-details', '["common_names"]')
        data.add_field('api-key', PLANTNET_API_KEY)
        
        try:
            async with session.post(url, data=data) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    suggestions = []
                    max_score = 0
                    identified_name = None
                    
                    for species in result.get('results', []):
                        score = species.get('score', 0)
                        if score > max_score:
                            max_score = score
                            identified_name = species.get('species', {}).get('scientificNameWithoutAuthor', '')
                        
                        suggestions.append({
                            'name': species.get('species', {}).get('scientificNameWithoutAuthor', ''),
                            'common_names': [name.get('value', '') for name in species.get('species', {}).get('commonNames', [])],
                            'confidence': score,
                            'family': species.get('species', {}).get('family', {}).get('scientificNameWithoutAuthor', '')
                        })
                    
                    return PlantIdentification(
                        suggestions=suggestions,
                        confidence=max_score,
                        identified_name=identified_name
                    )
        except Exception as e:
            logging.error(f"Error identifying plant with PlantNet: {e}")
        
        return PlantIdentification()

plant_service = PlantAPIService()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Plant Care Assistant API - Ready to help with your plants!"}

@api_router.get("/plants/search", response_model=List[PlantSearchResult])
async def search_plants(q: str):
    """Search for plants by name"""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters long")
    
    results = await plant_service.search_plants_perenual(q)
    return results

@api_router.get("/plants/{plant_id}/care", response_model=PlantCareInfo)
async def get_plant_care_info(plant_id: str):
    """Get detailed care information for a specific plant"""
    care_info = await plant_service.get_plant_care_info_perenual(plant_id)
    
    if not care_info:
        raise HTTPException(status_code=404, detail="Plant care information not found")
    
    return care_info

@api_router.post("/plants/identify", response_model=PlantIdentification)
async def identify_plant(file: UploadFile = File(...)):
    """Identify a plant from an uploaded image"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and process the image
    image_data = await file.read()
    
    # Convert to JPEG if needed
    try:
        image = Image.open(io.BytesIO(image_data))
        if image.format != 'JPEG':
            output = io.BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=85)
            image_data = output.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    identification = await plant_service.identify_plant_plantnet(image_data)
    return identification

@api_router.post("/user/{user_id}/plants", response_model=UserPlant)
async def add_user_plant(user_id: str, plant_data: dict):
    """Add a plant to user's collection"""
    user_plant = UserPlant(
        user_id=user_id,
        plant_id=plant_data.get('plant_id', ''),
        nickname=plant_data.get('nickname', ''),
        plant_name=plant_data.get('plant_name', ''),
        scientific_name=plant_data.get('scientific_name', ''),
        watering_frequency_days=plant_data.get('watering_frequency_days', 7),
        fertilizing_frequency_days=plant_data.get('fertilizing_frequency_days', 30),
        notes=plant_data.get('notes', ''),
        image_url=plant_data.get('image_url', '')
    )
    
    await db.user_plants.insert_one(user_plant.dict())
    
    # Create initial reminders
    await create_reminders_for_plant(user_plant)
    
    return user_plant

@api_router.get("/user/{user_id}/plants", response_model=List[UserPlant])
async def get_user_plants(user_id: str):
    """Get all plants in user's collection"""
    plants = await db.user_plants.find({"user_id": user_id}).to_list(1000)
    return [UserPlant(**plant) for plant in plants]

@api_router.get("/user/{user_id}/reminders", response_model=List[Reminder])
async def get_user_reminders(user_id: str):
    """Get pending reminders for user"""
    reminders = await db.reminders.find({
        "user_id": user_id,
        "completed": False,
        "due_date": {"$lte": datetime.utcnow() + timedelta(days=7)}
    }).to_list(1000)
    
    return [Reminder(**reminder) for reminder in reminders]

@api_router.post("/user/{user_id}/reminders/{reminder_id}/complete")
async def complete_reminder(user_id: str, reminder_id: str):
    """Mark a reminder as completed"""
    result = await db.reminders.update_one(
        {"id": reminder_id, "user_id": user_id},
        {"$set": {"completed": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Update the corresponding plant care dates
    reminder = await db.reminders.find_one({"id": reminder_id})
    if reminder:
        update_field = {}
        now = datetime.utcnow()
        
        if reminder['reminder_type'] == 'watering':
            update_field['last_watered'] = now
        elif reminder['reminder_type'] == 'fertilizing':
            update_field['last_fertilized'] = now
        elif reminder['reminder_type'] == 'repotting':
            update_field['last_repotted'] = now
        
        if update_field:
            await db.user_plants.update_one(
                {"id": reminder['plant_id']},
                {"$set": update_field}
            )
        
        # Create next reminder
        plant = await db.user_plants.find_one({"id": reminder['plant_id']})
        if plant:
            user_plant = UserPlant(**plant)
            await create_next_reminder(user_plant, reminder['reminder_type'])
    
    return {"message": "Reminder completed successfully"}

async def create_reminders_for_plant(user_plant: UserPlant):
    """Create initial reminders for a new plant"""
    now = datetime.utcnow()
    
    # Watering reminder
    watering_reminder = Reminder(
        user_id=user_plant.user_id,
        plant_id=user_plant.id,
        plant_nickname=user_plant.nickname,
        reminder_type="watering",
        due_date=now + timedelta(days=user_plant.watering_frequency_days)
    )
    
    # Fertilizing reminder
    fertilizing_reminder = Reminder(
        user_id=user_plant.user_id,
        plant_id=user_plant.id,
        plant_nickname=user_plant.nickname,
        reminder_type="fertilizing",
        due_date=now + timedelta(days=user_plant.fertilizing_frequency_days)
    )
    
    await db.reminders.insert_many([
        watering_reminder.dict(),
        fertilizing_reminder.dict()
    ])

async def create_next_reminder(user_plant: UserPlant, reminder_type: str):
    """Create the next reminder for a plant"""
    now = datetime.utcnow()
    
    if reminder_type == "watering":
        due_date = now + timedelta(days=user_plant.watering_frequency_days)
    elif reminder_type == "fertilizing":
        due_date = now + timedelta(days=user_plant.fertilizing_frequency_days)
    else:
        return
    
    reminder = Reminder(
        user_id=user_plant.user_id,
        plant_id=user_plant.id,
        plant_nickname=user_plant.nickname,
        reminder_type=reminder_type,
        due_date=due_date
    )
    
    await db.reminders.insert_one(reminder.dict())

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    # Create indexes for better performance
    await db.user_plants.create_index("user_id")
    await db.reminders.create_index([("user_id", 1), ("due_date", 1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    await plant_service.close_session()
    client.close()