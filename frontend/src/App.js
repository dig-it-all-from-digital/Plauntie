import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mock user ID for demo
const USER_ID = "demo-user";

// Language translations
const translations = {
  ru: {
    appName: "Plauntie",
    appSubtitle: "Ваш мудрый компаньон в мире растений",
    plantsInCollection: "Растений в коллекции",
    reminders: "Напоминаний",
    searchPlants: "🔍 Поиск растений",
    identifyPlant: "📸 Определить растение",
    myCollection: "🏡 Моя коллекция",
    remindersTab: "⏰ Напоминания",
    searchPlaceholder: "Введите название растения...",
    searchButton: "Найти",
    searching: "Поиск...",
    careButton: "Уход",
    addButton: "Добавить",
    identifyByPhoto: "📸 Определить растение по фото",
    selectPhoto: "Выберите фото растения",
    photoFormats: "PNG, JPG, JPEG до 10MB",
    identifyButton: "Определить растение",
    analyzing: "Анализируем фото...",
    identificationResults: "🎯 Результаты определения",
    confidence: "уверенность",
    commonNames: "Народные названия",
    family: "Семейство",
    identificationFailed: "К сожалению, не удалось определить растение. Попробуйте другое фото.",
    myCollectionTitle: "🏡 Моя коллекция растений",
    collectionEmpty: "Ваша коллекция пуста",
    collectionEmptyText: "Начните с поиска и добавления своих первых растений!",
    findPlantsButton: "Найти растения",
    lastWatering: "Последний полив",
    lastFertilizing: "Последнее удобрение",
    dateAdded: "Добавлено",
    never: "Никогда",
    remindersTitle: "⏰ Напоминания",
    allRemindersCompleted: "Все напоминания выполнены!",
    allRemindersCompletedText: "Отличная работа! Ваши растения будут вам благодарны.",
    completedButton: "Выполнено ✓",
    overdue: "🚨 Просрочено!",
    soon: "⚠️ Скоро!",
    due: "Срок",
    watering: "💧 Полив",
    fertilizing: "🌱 Удобрение",
    repotting: "🪴 Пересадка",
    plantAdded: "Растение добавлено в вашу коллекцию!",
    reminderCompleted: "Напоминание выполнено!",
    giveNickname: "Дайте прозвище вашему",
    addError: "Ошибка при добавлении растения. Попробуйте еще раз.",
    reminderError: "Ошибка при выполнении напоминания. Попробуйте еще раз.",
    careInfo: "Информация по уходу",
    careLevel: {
      easy: "🟢 Легкий уход",
      medium: "🟡 Средний уход",
      hard: "🔴 Сложный уход"
    },
    careFields: {
      watering: "💧 Полив",
      sunlight: "☀️ Освещение",
      temperature: "🌡️ Температура",
      humidity: "💨 Влажность",
      fertilizer: "🌱 Удобрение",
      repotting: "🪴 Пересадка"
    },
    careTips: "💡 Советы по уходу",
    darkTheme: "🌙 Темная тема",
    lightTheme: "☀️ Светлая тема"
  },
  en: {
    appName: "Plauntie",
    appSubtitle: "Your wise companion in the world of plants",
    plantsInCollection: "Plants in collection",
    reminders: "Reminders",
    searchPlants: "🔍 Search Plants",
    identifyPlant: "📸 Identify Plant",
    myCollection: "🏡 My Collection",
    remindersTab: "⏰ Reminders",
    searchPlaceholder: "Enter plant name...",
    searchButton: "Search",
    searching: "Searching...",
    careButton: "Care",
    addButton: "Add",
    identifyByPhoto: "📸 Identify plant by photo",
    selectPhoto: "Select plant photo",
    photoFormats: "PNG, JPG, JPEG up to 10MB",
    identifyButton: "Identify Plant",
    analyzing: "Analyzing photo...",
    identificationResults: "🎯 Identification Results",
    confidence: "confidence",
    commonNames: "Common names",
    family: "Family",
    identificationFailed: "Unfortunately, could not identify the plant. Try another photo.",
    myCollectionTitle: "🏡 My Plant Collection",
    collectionEmpty: "Your collection is empty",
    collectionEmptyText: "Start by searching and adding your first plants!",
    findPlantsButton: "Find Plants",
    lastWatering: "Last watering",
    lastFertilizing: "Last fertilizing",
    dateAdded: "Added",
    never: "Never",
    remindersTitle: "⏰ Reminders",
    allRemindersCompleted: "All reminders completed!",
    allRemindersCompletedText: "Great work! Your plants will thank you.",
    completedButton: "Completed ✓",
    overdue: "🚨 Overdue!",
    soon: "⚠️ Soon!",
    due: "Due",
    watering: "💧 Watering",
    fertilizing: "🌱 Fertilizing",
    repotting: "🪴 Repotting",
    plantAdded: "Plant added to your collection!",
    reminderCompleted: "Reminder completed!",
    giveNickname: "Give a nickname to your",
    addError: "Error adding plant. Please try again.",
    reminderError: "Error completing reminder. Please try again.",
    careInfo: "Care Information",
    careLevel: {
      easy: "🟢 Easy care",
      medium: "🟡 Medium care",
      hard: "🔴 Hard care"
    },
    careFields: {
      watering: "💧 Watering",
      sunlight: "☀️ Sunlight",
      temperature: "🌡️ Temperature",
      humidity: "💨 Humidity",
      fertilizer: "🌱 Fertilizer",
      repotting: "🪴 Repotting"
    },
    careTips: "💡 Care Tips",
    darkTheme: "🌙 Dark Theme",
    lightTheme: "☀️ Light Theme"
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userPlants, setUserPlants] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plantCareInfo, setPlantCareInfo] = useState(null);
  const [identificationFile, setIdentificationFile] = useState(null);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [language, setLanguage] = useState('ru');
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const t = translations[language];

  useEffect(() => {
    loadUserPlants();
    loadReminders();
    
    // Load theme preference
    const savedTheme = localStorage.getItem('plauntie-theme');
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
    }
    
    // Load language preference  
    const savedLanguage = localStorage.getItem('plauntie-language');
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Apply theme to body and save to localStorage
    document.body.className = isDarkTheme ? 'dark-theme' : 'light-theme';
    localStorage.setItem('plauntie-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('plauntie-language', language);
  }, [language]);

  const loadUserPlants = async () => {
    try {
      const response = await axios.get(`${API}/user/${USER_ID}/plants`);
      setUserPlants(response.data);
    } catch (error) {
      console.error('Error loading user plants:', error);
    }
  };

  const loadReminders = async () => {
    try {
      const response = await axios.get(`${API}/user/${USER_ID}/reminders`);
      setReminders(response.data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const searchPlants = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/plants/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlantCareInfo = async (plantId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/plants/${plantId}/care`);
      setPlantCareInfo(response.data);
      setSelectedPlant(searchResults.find(p => p.id === plantId));
    } catch (error) {
      console.error('Error getting plant care info:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlantToCollection = async (plant) => {
    const nickname = prompt(`${t.giveNickname} ${plant.name}:`);
    if (!nickname) return;

    setLoading(true);
    try {
      const plantData = {
        plant_id: plant.id,
        nickname: nickname,
        plant_name: plant.name,
        scientific_name: plant.scientific_name,
        image_url: plant.image_url,
        watering_frequency_days: 7,
        fertilizing_frequency_days: 30
      };

      await axios.post(`${API}/user/${USER_ID}/plants`, plantData);
      
      await Promise.all([
        loadUserPlants(),
        loadReminders()
      ]);
      
      alert(t.plantAdded);
      setActiveTab('collection');
    } catch (error) {
      console.error('Error adding plant to collection:', error);
      alert(t.addError);
    } finally {
      setLoading(false);
    }
  };

  const completeReminder = async (reminderId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/user/${USER_ID}/reminders/${reminderId}/complete`);
      
      await Promise.all([
        loadReminders(),
        loadUserPlants()
      ]);
      
      alert(t.reminderCompleted);
    } catch (error) {
      console.error('Error completing reminder:', error);
      alert(t.reminderError);
    } finally {
      setLoading(false);
    }
  };

  const identifyPlant = async () => {
    if (!identificationFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', identificationFile);

    try {
      const response = await axios.post(`${API}/plants/identify`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setIdentificationResult(response.data);
    } catch (error) {
      console.error('Error identifying plant:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t.never;
    return new Date(dateString).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US');
  };

  const getReminderTypeText = (type) => {
    return t[type] || type;
  };

  const getReminderUrgency = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'urgent';
    if (diffDays <= 2) return 'soon';
    return 'normal';
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const getCareLevel = (level) => {
    return t.careLevel[level] || level;
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDarkTheme ? 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-800' : 'bg-gradient-to-br from-green-50 to-emerald-100'}`}>
      {/* Header */}
      <header className={`shadow-lg border-b-4 transition-all duration-300 ${isDarkTheme ? 'bg-gray-800 border-green-600' : 'bg-white border-green-500'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-4xl mr-3">🌿</div>
              <div>
                <h1 className={`text-3xl font-bold transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                  {t.appName}
                </h1>
                <p className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t.appSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`text-sm transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-500'}`}>
                {t.plantsInCollection}: <span className={`font-bold ${isDarkTheme ? 'text-green-400' : 'text-green-600'}`}>{userPlants.length}</span>
              </div>
              <div className={`text-sm transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-500'}`}>
                {t.reminders}: <span className={`font-bold ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>{reminders.length}</span>
              </div>
              <button
                onClick={toggleLanguage}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isDarkTheme 
                    ? 'bg-green-700 text-green-100 hover:bg-green-600' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {language === 'ru' ? 'EN' : 'RU'}
              </button>
              <button
                onClick={toggleTheme}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isDarkTheme 
                    ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {isDarkTheme ? t.lightTheme : t.darkTheme}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`shadow-sm transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'search', label: t.searchPlants },
              { id: 'identify', label: t.identifyPlant },
              { id: 'collection', label: t.myCollection },
              { id: 'reminders', label: t.remindersTab }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? `${isDarkTheme ? 'border-green-400 text-green-400' : 'border-green-500 text-green-600'}`
                    : `border-transparent ${isDarkTheme ? 'text-gray-400 hover:text-gray-200 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className={`rounded-xl shadow-lg p-6 transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                {t.searchPlants}
              </h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchPlants()}
                  placeholder={t.searchPlaceholder}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 ${
                    isDarkTheme 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-green-400' 
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                />
                <button
                  onClick={searchPlants}
                  disabled={loading}
                  className={`px-8 py-3 rounded-lg disabled:opacity-50 transition-all duration-300 ${
                    isDarkTheme
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {loading ? t.searching : t.searchButton}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((plant) => (
                  <div key={plant.id} className={`rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
                    {plant.image_url && (
                      <img 
                        src={plant.image_url} 
                        alt={plant.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                        {plant.name}
                      </h3>
                      <p className={`italic mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        {plant.scientific_name}
                      </p>
                      {plant.care_level && (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                          plant.care_level === 'easy' 
                            ? `${isDarkTheme ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'}` :
                          plant.care_level === 'medium' 
                            ? `${isDarkTheme ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}` :
                            `${isDarkTheme ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'}`
                        }`}>
                          {getCareLevel(plant.care_level)}
                        </span>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => getPlantCareInfo(plant.id)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-all duration-300 ${
                            isDarkTheme
                              ? 'bg-blue-600 text-white hover:bg-blue-500'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {t.careButton}
                        </button>
                        <button
                          onClick={() => addPlantToCollection(plant)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-all duration-300 ${
                            isDarkTheme
                              ? 'bg-green-600 text-white hover:bg-green-500'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {t.addButton}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Plant Care Info Modal */}
            {plantCareInfo && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                        {plantCareInfo.name}
                      </h2>
                      <button 
                        onClick={() => setPlantCareInfo(null)}
                        className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className={`italic mb-6 transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                      {plantCareInfo.scientific_name}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(t.careFields).map(([key, label]) => (
                        plantCareInfo[key] && (
                          <div key={key} className={`p-4 rounded-lg transition-all duration-300 ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <h4 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                              {label}
                            </h4>
                            <p className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                              {plantCareInfo[key]}
                            </p>
                          </div>
                        )
                      ))}
                    </div>

                    {plantCareInfo.care_tips && plantCareInfo.care_tips.length > 0 && (
                      <div className="mt-6">
                        <h4 className={`font-semibold mb-3 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                          {t.careTips}
                        </h4>
                        <ul className="space-y-2">
                          {plantCareInfo.care_tips.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                                {tip}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Identify Tab */}
        {activeTab === 'identify' && (
          <div className="space-y-6">
            <div className={`rounded-xl shadow-lg p-6 transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                {t.identifyByPhoto}
              </h2>
              <div className="space-y-4">
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                  isDarkTheme ? 'border-gray-600 hover:border-green-400' : 'border-gray-300 hover:border-green-500'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdentificationFile(e.target.files[0])}
                    className="hidden"
                    id="plant-image"
                  />
                  <label 
                    htmlFor="plant-image"
                    className="cursor-pointer block"
                  >
                    {identificationFile ? (
                      <div>
                        <div className="text-6xl mb-4">📷</div>
                        <p className={`text-lg font-medium mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                          {identificationFile.name}
                        </p>
                        <p className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                          Нажмите, чтобы выбрать другое фото
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-4">📁</div>
                        <p className={`text-lg font-medium mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                          {t.selectPhoto}
                        </p>
                        <p className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t.photoFormats}
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                
                {identificationFile && (
                  <button
                    onClick={identifyPlant}
                    disabled={loading}
                    className={`w-full px-6 py-3 rounded-lg disabled:opacity-50 transition-all duration-300 ${
                      isDarkTheme
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {loading ? t.analyzing : t.identifyButton}
                  </button>
                )}
              </div>
            </div>

            {/* Identification Results */}
            {identificationResult && (
              <div className={`rounded-xl shadow-lg p-6 transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                  {t.identificationResults}
                </h3>
                {identificationResult.suggestions && identificationResult.suggestions.length > 0 ? (
                  <div className="space-y-4">
                    {identificationResult.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className={`border rounded-lg p-4 transition-all duration-300 ${isDarkTheme ? 'border-gray-600 bg-gray-700' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-semibold transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                            {suggestion.name}
                          </h4>
                          <span className={`px-2 py-1 rounded text-sm font-medium transition-all duration-300 ${
                            isDarkTheme ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
                          }`}>
                            {Math.round(suggestion.confidence * 100)}% {t.confidence}
                          </span>
                        </div>
                        {suggestion.common_names && suggestion.common_names.length > 0 && (
                          <p className={`mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            {t.commonNames}: {suggestion.common_names.slice(0, 3).join(', ')}
                          </p>
                        )}
                        {suggestion.family && (
                          <p className={`text-sm transition-colors duration-300 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t.family}: {suggestion.family}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {t.identificationFailed}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            <div className={`rounded-xl shadow-lg p-6 transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                {t.myCollectionTitle}
              </h2>
              
              {userPlants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userPlants.map((plant) => (
                    <div key={plant.id} className={`rounded-xl p-6 border transition-all duration-300 ${
                      isDarkTheme 
                        ? 'bg-gradient-to-br from-gray-700 to-green-800 border-green-600' 
                        : 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200'
                    }`}>
                      {plant.image_url && (
                        <img 
                          src={plant.image_url} 
                          alt={plant.nickname}
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className={`text-lg font-bold mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                        {plant.nickname}
                      </h3>
                      <p className={`mb-1 transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        {plant.plant_name}
                      </p>
                      <p className={`text-sm italic mb-4 transition-colors duration-300 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                        {plant.scientific_name}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            {t.lastWatering}:
                          </span>
                          <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                            {formatDate(plant.last_watered)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            {t.lastFertilizing}:
                          </span>
                          <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                            {formatDate(plant.last_fertilized)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            {t.dateAdded}:
                          </span>
                          <span className={`transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                            {formatDate(plant.date_added)}
                          </span>
                        </div>
                      </div>
                      
                      {plant.notes && (
                        <div className={`mt-4 p-3 rounded-lg transition-all duration-300 ${isDarkTheme ? 'bg-gray-600' : 'bg-white'}`}>
                          <p className={`text-sm transition-colors duration-300 ${isDarkTheme ? 'text-gray-200' : 'text-gray-700'}`}>
                            {plant.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌱</div>
                  <h3 className={`text-xl font-medium mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                    {t.collectionEmpty}
                  </h3>
                  <p className={`mb-6 transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {t.collectionEmptyText}
                  </p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                      isDarkTheme
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {t.findPlantsButton}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="space-y-6">
            <div className={`rounded-xl shadow-lg p-6 transition-all duration-300 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                {t.remindersTitle}
              </h2>
              
              {reminders.length > 0 ? (
                <div className="space-y-4">
                  {reminders.map((reminder) => {
                    const urgency = getReminderUrgency(reminder.due_date);
                    return (
                      <div 
                        key={reminder.id} 
                        className={`p-4 rounded-lg border-l-4 transition-all duration-300 ${
                          urgency === 'urgent' 
                            ? `${isDarkTheme ? 'bg-red-900 border-red-500' : 'bg-red-50 border-red-500'}` :
                          urgency === 'soon' 
                            ? `${isDarkTheme ? 'bg-yellow-900 border-yellow-500' : 'bg-yellow-50 border-yellow-500'}` :
                            `${isDarkTheme ? 'bg-green-900 border-green-500' : 'bg-green-50 border-green-500'}`
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className={`font-semibold transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                              {getReminderTypeText(reminder.reminder_type)} - {reminder.plant_nickname}
                            </h3>
                            <p className={`text-sm transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                              {t.due}: {formatDate(reminder.due_date)}
                            </p>
                            {urgency === 'urgent' && (
                              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full transition-all duration-300 ${
                                isDarkTheme ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
                              }`}>
                                {t.overdue}
                              </span>
                            )}
                            {urgency === 'soon' && (
                              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full transition-all duration-300 ${
                                isDarkTheme ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {t.soon}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => completeReminder(reminder.id)}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                              isDarkTheme
                                ? 'bg-green-600 text-white hover:bg-green-500'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {t.completedButton}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className={`text-xl font-medium mb-2 transition-colors duration-300 ${isDarkTheme ? 'text-green-400' : 'text-gray-900'}`}>
                    {t.allRemindersCompleted}
                  </h3>
                  <p className={`transition-colors duration-300 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {t.allRemindersCompletedText}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;