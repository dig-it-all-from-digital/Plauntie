# Plauntie: Your Caring Plant Companion

Plauntie is a web application designed to be your best friend in the world of gardening. It combines the power of modern AI technologies with the convenience of a Progressive Web App (PWA) to help you care for your "green friends" with ease and joy.

Our main assistant is Auntie Plauntie, a wise and caring AI character who is always ready to give advice, identify a plant from a photo, or even diagnose its diseases.

## 🌿 Core Features

*   **AI Assistant Chat**: Ask any questions about plants and get friendly, helpful answers from Auntie Plauntie.
*   **Plant Identification by Photo**: Simply upload a photo, and Plauntie will help identify the plant species and tell you about it.
*   **Health Diagnosis**: Upload a photo of a sick plant, and the AI will diagnose the issue and suggest a treatment plan.
*   **PWA (Progressive Web App)**: Install Plauntie on your phone's home screen for quick access and a native app feel.
*   **Push Notifications**: Get timely reminders for watering, fertilizing, and repotting, even when the app is closed.
*   **Plant Collection**: Keep a list of your plants, add notes, and track their care history.
*   **Mobile-First Design**: The interface is designed with a focus on ease of use on mobile devices.

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI, MongoDB, Uvicorn
*   **Frontend**: React.js, Tailwind CSS
*   **AI**: OpenRouter API (`qwen/qwen2.5-vl-72b-instruct:free`)
*   **Push Notifications**: `pywebpush`

## 🚀 Setup and Run

### Prerequisites

*   Python 3.10+
*   Node.js 16+ and Yarn
*   MongoDB

### 1. Backend Setup

```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Configure environment variables
# Copy backend/.env.example to backend/.env and fill it out
# Be sure to provide your OPENROUTER_API_KEY and generate VAPID_KEYS

# 3. Run the backend server
uvicorn backend.server:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js dependencies
yarn install

# 3. Run the development server
yarn start
```

The application will be available at `http://localhost:3000`.

## ⚙️ Environment Variables

For the backend to work, you need to create a `backend/.env` file with the following variables:

```
# MongoDB Configuration
MONGO_URL="mongodb://localhost:27017"
DB_NAME="plauntie_db"

# AI Model API Key
OPENROUTER_API_KEY="your_openrouter_key"

# VAPID Keys for Push Notifications (generate once)
VAPID_PRIVATE_KEY="your_vapid_private_key"
VAPID_PUBLIC_KEY="your_vapid_public_key"

# Keys for other APIs (optional, if you want to use the old functionality)
PERENUAL_API_KEY=""
PLANTNET_API_KEY=""
# ... and others
```
