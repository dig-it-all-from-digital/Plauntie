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
from openai import OpenAI


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
# mongo_url = os.environ['MONGO_URL']
# client = AsyncIOMotorClient(mongo_url)
# db = client[os.environ['DB_NAME']]
db = None # Placeholder
client = None # Placeholder

# Create the main app without a prefix
app = FastAPI(title="Plauntie - Plant Care Assistant API")

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
from pywebpush import webpush, WebPushException

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")

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


class EnhancedPlantIdentification(PlantIdentification):
    plauntie_description: Optional[str] = None


class DiagnosisResponse(BaseModel):
    diagnosis_text: str


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


class ChatRequest(BaseModel):
    message: str
    enable_web_search: bool = False


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscription(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    user_id: str


# Plant API Integration Services
class PlantAPIService:
    def __init__(self):
        self.session = None
        # Russian to English plant name translations
        self.plant_translations = {
            'роза': 'rose',
            'розы': 'rose',
            'фиалка': 'violet',
            'фиалки': 'violet',
            'кактус': 'cactus',
            'кактусы': 'cactus',
            'фикус': 'ficus',
            'фикусы': 'ficus',
            'орхидея': 'orchid',
            'орхидеи': 'orchid',
            'тюльпан': 'tulip',
            'тюльпаны': 'tulip',
            'лилия': 'lily',
            'лилии': 'lily',
            'ромашка': 'daisy',
            'ромашки': 'daisy',
            'подсолнух': 'sunflower',
            'подсолнухи': 'sunflower',
            'пион': 'peony',
            'пионы': 'peony',
            'лаванда': 'lavender',
            'мята': 'mint',
            'базилик': 'basil',
            'петрушка': 'parsley',
            'укроп': 'dill',
            'алоэ': 'aloe',
            'каланхоэ': 'kalanchoe',
            'герань': 'geranium',
            'бегония': 'begonia',
            'драцена': 'dracaena',
            'пальма': 'palm',
            'плющ': 'ivy',
            'папоротник': 'fern',
            'мох': 'moss',
            'суккулент': 'succulent',
            'суккуленты': 'succulent',
            'денежное дерево': 'jade plant',
            'фиалка узамбарская': 'african violet',
            'комнатная роза': 'indoor rose',
            'цветок': 'flower',
            'цветы': 'flower',
            'растение': 'plant',
            'растения': 'plant',
            'трава': 'grass',
            'дерево': 'tree',
            'куст': 'bush'
        }
    
    def translate_query(self, query: str) -> str:
        """Translate Russian plant names to English"""
        query_lower = query.lower().strip()
        
        # Direct translation
        if query_lower in self.plant_translations:
            return self.plant_translations[query_lower]
        
        # Partial match
        for russian, english in self.plant_translations.items():
            if russian in query_lower or query_lower in russian:
                return english
        
        return query  # Return original if no translation found
    
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
        
        # Translate Russian to English if needed
        translated_query = self.translate_query(query)
        logging.info(f"Original query: '{query}' -> Translated: '{translated_query}'")
        
        url = f"https://perenual.com/api/species-list"
        params = {
            'key': PERENUAL_API_KEY,
            'q': translated_query,
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
                    
                    logging.info(f"Found {len(results)} plants for query '{translated_query}'")
                    return results
                else:
                    logging.error(f"Perenual API returned status {response.status}")
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
                    
                    # Check if data is valid
                    if not data or 'error' in data:
                        logging.error(f"Invalid data from Perenual API: {data}")
                        return None
                    
                    care_info = PlantCareInfo(
                        plant_id=plant_id,
                        name=data.get('common_name', 'Unknown'),
                        scientific_name=data.get('scientific_name', ['Unknown'])[0] if data.get('scientific_name') else 'Unknown',
                        watering=data.get('watering', 'Информация недоступна'),
                        sunlight=data.get('sunlight', ['Информация недоступна'])[0] if data.get('sunlight') else 'Информация недоступна',
                        temperature=f"{data.get('hardiness', {}).get('min', 'N/A')} - {data.get('hardiness', {}).get('max', 'N/A')}°C" if data.get('hardiness') else 'Информация недоступна',
                        humidity=data.get('humidity', 'Информация недоступна'),
                        fertilizer=data.get('fertilizer', 'Информация недоступна'),
                        repotting=data.get('repotting', 'Информация недоступна'),
                        common_problems=data.get('problem', []),
                        care_tips=data.get('care_guides', [])
                    )
                    
                    return care_info
                else:
                    logging.error(f"Perenual API returned status {response.status}")
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


# LLM Integration Service
class LLMService:
    def __init__(self):
        if not OPENROUTER_API_KEY:
            logger.error("OPENROUTER_API_KEY is not set.")
            self.client = None
            return

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        self.model_name = "qwen/qwen2.5-vl-72b-instruct:free"
        self.system_prompt = """
        Ты — Plauntie, мудрая, добрая и невероятно знающая тетушка, которая обожает растения и садоводство.
        У тебя теплый, заботливый и немного чудаковатый характер. Ты всегда говоришь мягким и ободряющим тоном.
        Ты любишь делиться своей мудростью, но делаешь это просто и понятно, как будто разговариваешь с любимой племянницей или племянником.
        Ты называешь растения "маленькими зелеными друзьями" или "голубчиками".
        Ты умеешь определять растения, диагностировать их проблемы по фотографиям и давать подробные, дружелюбные советы.
        Когда тебе задают вопрос, дай полезный и заботливый ответ.
        Если для ответа нужна информация из интернета, ты можешь сделать поиск, чтобы дать самый точный совет.
        Твои ответы должны быть лаконичными, но полными тепла и индивидуальности. Всегда говори по-русски.
        """

    async def get_chat_response(self, user_message: str, enable_web_search: bool = False) -> str:
        if not self.client:
            return "Извините, мой хороший, я сейчас не могу подключиться к своей базе знаний. Пожалуйста, убедитесь, что API-ключ настроен."

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message},
        ]

        model_to_use = self.model_name
        if enable_web_search:
            model_to_use += ":online"

        try:
            completion = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=model_to_use,
                messages=messages,
            )
            response = completion.choices[0].message.content
            return response.strip()
        except Exception as e:
            logger.error(f"Error getting chat response from LLM: {e}")
            return "Ой, дорогуша, что-то пошло не так. Я не смогла получить ответ. Попробуй спросить еще раз чуть позже."

    async def get_image_analysis(self, image_data: bytes, prompt: str) -> str:
        if not self.client:
            return "Извините, мой хороший, я сейчас не могу подключиться к своей базе знаний. Пожалуйста, убедитесь, что API-ключ настроен."

        base64_image = base64.b64encode(image_data).decode('utf-8')

        messages = [
            {"role": "system", "content": self.system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        },
                    },
                ],
            },
        ]

        try:
            completion = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model_name, # No online mode for this one, as it's for direct image analysis
                messages=messages,
                max_tokens=1024,
            )
            response = completion.choices[0].message.content
            return response.strip()
        except Exception as e:
            logger.error(f"Error getting image analysis from LLM: {e}")
            return "Ах, не могу разглядеть картинку, милый. Что-то с моим зрением сегодня. Попробуй еще раз, пожалуйста."

llm_service = LLMService()


# Push Notification Service
VAPID_CLAIMS = {
    "sub": "mailto:admin@plauntie.com"
}

def send_push_notification(subscription_info: dict, message_body: str):
    if not VAPID_PRIVATE_KEY:
        logger.error("VAPID_PRIVATE_KEY not set. Cannot send push notification.")
        return

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps({"body": message_body}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS.copy()
        )
        logger.info("Push notification sent successfully.")
    except WebPushException as ex:
        logger.error(f"Error sending push notification: {ex}")
        if ex.response and ex.response.status_code == 410:
            logger.info("Subscription is expired or invalid, should be deleted.")


async def trigger_push_for_reminder(reminder: Reminder):
    if not db:
        return

    logger.info(f"Triggering push for reminder {reminder.id} for user {reminder.user_id}")
    subscriptions = await db.push_subscriptions.find({'user_id': reminder.user_id}).to_list(100)

    for sub in subscriptions:
        message = f"🌿 Напоминание от Plauntie! Пора полить вашего друга '{reminder.plant_nickname}'."
        if reminder.reminder_type == 'fertilizing':
            message = f"🌿 Напоминание от Plauntie! Пора удобрить вашего друга '{reminder.plant_nickname}'."
        elif reminder.reminder_type == 'repotting':
            message = f"🌿 Напоминание от Plauntie! Пора пересадить вашего друга '{reminder.plant_nickname}'."

        send_push_notification(
            subscription_info={
                "endpoint": sub['endpoint'],
                "keys": sub['keys']
            },
            message_body=message
        )


plant_service = PlantAPIService()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Plauntie API - Your wise plant companion is ready to help!"}


@api_router.post("/chat")
async def handle_chat(request: ChatRequest):
    """Handle a chat message from the user and get a response from the LLM."""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    response = await llm_service.get_chat_response(
        user_message=request.message,
        enable_web_search=request.enable_web_search
    )
    return {"response": response}


@api_router.post("/subscribe")
async def subscribe_for_pushes(subscription: PushSubscription):
    """Subscribe a user for push notifications."""
    if not db:
        return {"message": "Subscription received (DB disabled)."}

    try:
        await db.push_subscriptions.update_one(
            {'endpoint': subscription.endpoint},
            {'$set': subscription.model_dump()},
            upsert=True
        )
        return {"message": "Subscription successful."}
    except Exception as e:
        logger.error(f"Error saving push subscription: {e}")
        raise HTTPException(status_code=500, detail="Could not save subscription.")


@api_router.get("/vapid-public-key")
async def get_vapid_public_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID public key not configured on server.")
    return {"public_key": VAPID_PUBLIC_KEY}


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
        # Fallback: try to get basic info from search results
        search_results = await plant_service.search_plants_perenual("id:" + plant_id)
        if search_results:
            plant = search_results[0]
            care_info = PlantCareInfo(
                plant_id=plant_id,
                name=plant.name,
                scientific_name=plant.scientific_name,
                watering="Регулярный полив по мере высыхания почвы",
                sunlight="Яркий рассеянный свет",
                temperature="18-24°C",
                humidity="Умеренная влажность 40-60%",
                fertilizer="Подкормка раз в 2-4 недели в период роста",
                repotting="Пересадка каждые 1-2 года весной",
                common_problems=["Переувлажнение", "Недостаток света", "Вредители"],
                care_tips=[
                    "Проверяйте влажность почвы перед поливом",
                    "Обеспечьте хорошее освещение",
                    "Регулярно осматривайте растение на предмет вредителей",
                    "Поддерживайте стабильную температуру"
                ]
            )
        else:
            raise HTTPException(status_code=404, detail="Plant care information not found")
    
    return care_info

@api_router.post("/plants/identify", response_model=EnhancedPlantIdentification)
async def identify_plant(file: UploadFile = File(...)):
    """Identify a plant from an uploaded image using both PlantNet and LLM."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    image_data = await file.read()
    
    try:
        image = Image.open(io.BytesIO(image_data))
        if image.format != 'JPEG':
            output = io.BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=85)
            image_data = output.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    plantnet_identification = await plant_service.identify_plant_plantnet(image_data)

    llm_prompt = ""
    if plantnet_identification.identified_name:
        llm_prompt = f"Тетушка, взгляни на это фото. Мне кажется, это {plantnet_identification.identified_name}. Можешь подтвердить и рассказать об этом растении что-нибудь интересное? Как за ним лучше ухаживать?"
    else:
        llm_prompt = "Тетушка, помоги, пожалуйста, определить, что это за растение на фото, и расскажи немного о нем и об уходе."

    plauntie_description = await llm_service.get_image_analysis(image_data, llm_prompt)

    return EnhancedPlantIdentification(
        suggestions=plantnet_identification.suggestions,
        confidence=plantnet_identification.confidence,
        identified_name=plantnet_identification.identified_name,
        plauntie_description=plauntie_description
    )


@api_router.post("/plants/diagnose", response_model=DiagnosisResponse)
async def diagnose_plant(file: UploadFile = File(...)):
    """Diagnose a plant's health from an image using the LLM."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_data = await file.read()

    try:
        image = Image.open(io.BytesIO(image_data))
        if image.format != 'JPEG':
            output = io.BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=85)
            image_data = output.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")

    prompt = "Тетушка, посмотри на мой цветочек. Мне кажется, он заболел. Что с ним не так и как его вылечить? Дай подробный и заботливый ответ."

    diagnosis_text = await llm_service.get_image_analysis(image_data, prompt)

    return DiagnosisResponse(diagnosis_text=diagnosis_text)


@api_router.post("/user/{user_id}/plants", response_model=UserPlant)
async def add_user_plant(user_id: str, plant_data: dict):
    """Add a plant to user's collection"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
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
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    plants = await db.user_plants.find({"user_id": user_id}).to_list(1000)
    return [UserPlant(**plant) for plant in plants]

@api_router.get("/user/{user_id}/reminders", response_model=List[Reminder])
async def get_user_reminders(user_id: str):
    """Get pending reminders for user"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    reminders = await db.reminders.find({
        "user_id": user_id,
        "completed": False,
        "due_date": {"$lte": datetime.utcnow() + timedelta(days=7)}
    }).to_list(1000)
    
    return [Reminder(**reminder) for reminder in reminders]

@api_router.post("/user/{user_id}/reminders/{reminder_id}/complete")
async def complete_reminder(user_id: str, reminder_id: str):
    """Mark a reminder as completed"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
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
    if not db:
        return
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

    # Send pushes for the new reminders
    await trigger_push_for_reminder(watering_reminder)
    await trigger_push_for_reminder(fertilizing_reminder)

async def create_next_reminder(user_plant: UserPlant, reminder_type: str):
    """Create the next reminder for a plant"""
    if not db:
        return
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
    await trigger_push_for_reminder(reminder)

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

# @app.on_event("startup")
# async def startup_db_client():
#     # Create indexes for better performance
#     if db:
#         await db.user_plants.create_index("user_id")
#         await db.reminders.create_index([("user_id", 1), ("due_date", 1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    await plant_service.close_session()
    if client:
        client.close()