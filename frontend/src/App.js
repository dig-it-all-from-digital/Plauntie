import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mock user ID for demo
const USER_ID = "demo-user";

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

  useEffect(() => {
    loadUserPlants();
    loadReminders();
  }, []);

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
    const nickname = prompt(`Дайте прозвище вашему ${plant.name}:`);
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
      
      // Immediately refresh data
      await Promise.all([
        loadUserPlants(),
        loadReminders()
      ]);
      
      alert('Растение добавлено в вашу коллекцию!');
      
      // Switch to collection tab to show the added plant
      setActiveTab('collection');
    } catch (error) {
      console.error('Error adding plant to collection:', error);
      alert('Ошибка при добавлении растения. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const completeReminder = async (reminderId) => {
    try {
      await axios.post(`${API}/user/${USER_ID}/reminders/${reminderId}/complete`);
      await loadReminders();
      await loadUserPlants();
      alert('Напоминание выполнено!');
    } catch (error) {
      console.error('Error completing reminder:', error);
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
    if (!dateString) return 'Никогда';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getReminderTypeText = (type) => {
    switch (type) {
      case 'watering': return '💧 Полив';
      case 'fertilizing': return '🌱 Удобрение';
      case 'repotting': return '🪴 Пересадка';
      default: return type;
    }
  };

  const getReminderUrgency = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'urgent';
    if (diffDays <= 2) return 'soon';
    return 'normal';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-4xl mr-3">🌿</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">PlantCare Assistant</h1>
                <p className="text-gray-600">Ваш мудрый компаньон в мире растений</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Растений в коллекции: <span className="font-bold text-green-600">{userPlants.length}</span>
              </div>
              <div className="text-sm text-gray-500">
                Напоминаний: <span className="font-bold text-red-600">{reminders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'search', label: '🔍 Поиск растений', icon: '🔍' },
              { id: 'identify', label: '📸 Определить растение', icon: '📸' },
              { id: 'collection', label: '🏡 Моя коллекция', icon: '🏡' },
              { id: 'reminders', label: '⏰ Напоминания', icon: '⏰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Поиск растений</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchPlants()}
                  placeholder="Введите название растения..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={searchPlants}
                  disabled={loading}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Поиск...' : 'Найти'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((plant) => (
                  <div key={plant.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {plant.image_url && (
                      <img 
                        src={plant.image_url} 
                        alt={plant.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plant.name}</h3>
                      <p className="text-gray-600 italic mb-2">{plant.scientific_name}</p>
                      {plant.care_level && (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                          plant.care_level === 'easy' ? 'bg-green-100 text-green-800' :
                          plant.care_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {plant.care_level === 'easy' ? '🟢 Легкий уход' :
                           plant.care_level === 'medium' ? '🟡 Средний уход' :
                           '🔴 Сложный уход'}
                        </span>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => getPlantCareInfo(plant.id)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Уход
                        </button>
                        <button
                          onClick={() => addPlantToCollection(plant)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Добавить
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
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">{plantCareInfo.name}</h2>
                      <button 
                        onClick={() => setPlantCareInfo(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="text-gray-600 italic mb-6">{plantCareInfo.scientific_name}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: '💧 Полив', value: plantCareInfo.watering },
                        { label: '☀️ Освещение', value: plantCareInfo.sunlight },
                        { label: '🌡️ Температура', value: plantCareInfo.temperature },
                        { label: '💨 Влажность', value: plantCareInfo.humidity },
                        { label: '🌱 Удобрение', value: plantCareInfo.fertilizer },
                        { label: '🪴 Пересадка', value: plantCareInfo.repotting }
                      ].map((item) => (
                        item.value && (
                          <div key={item.label} className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2">{item.label}</h4>
                            <p className="text-gray-700">{item.value}</p>
                          </div>
                        )
                      ))}
                    </div>

                    {plantCareInfo.care_tips && plantCareInfo.care_tips.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">💡 Советы по уходу</h4>
                        <ul className="space-y-2">
                          {plantCareInfo.care_tips.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span className="text-gray-700">{tip}</span>
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📸 Определить растение по фото</h2>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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
                        <p className="text-lg font-medium text-gray-900">{identificationFile.name}</p>
                        <p className="text-gray-500">Нажмите, чтобы выбрать другое фото</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-4">📁</div>
                        <p className="text-lg font-medium text-gray-900">Выберите фото растения</p>
                        <p className="text-gray-500">PNG, JPG, JPEG до 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
                
                {identificationFile && (
                  <button
                    onClick={identifyPlant}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Анализируем фото...' : 'Определить растение'}
                  </button>
                )}
              </div>
            </div>

            {/* Identification Results */}
            {identificationResult && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Результаты определения</h3>
                {identificationResult.suggestions && identificationResult.suggestions.length > 0 ? (
                  <div className="space-y-4">
                    {identificationResult.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{suggestion.name}</h4>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                            {Math.round(suggestion.confidence * 100)}% уверенность
                          </span>
                        </div>
                        {suggestion.common_names && suggestion.common_names.length > 0 && (
                          <p className="text-gray-600 mb-2">
                            Народные названия: {suggestion.common_names.slice(0, 3).join(', ')}
                          </p>
                        )}
                        {suggestion.family && (
                          <p className="text-gray-500 text-sm">Семейство: {suggestion.family}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">К сожалению, не удалось определить растение. Попробуйте другое фото.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🏡 Моя коллекция растений</h2>
              
              {userPlants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userPlants.map((plant) => (
                    <div key={plant.id} className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
                      {plant.image_url && (
                        <img 
                          src={plant.image_url} 
                          alt={plant.nickname}
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{plant.nickname}</h3>
                      <p className="text-gray-600 mb-1">{plant.plant_name}</p>
                      <p className="text-gray-500 text-sm italic mb-4">{plant.scientific_name}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Последний полив:</span>
                          <span className="text-gray-900">{formatDate(plant.last_watered)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Последнее удобрение:</span>
                          <span className="text-gray-900">{formatDate(plant.last_fertilized)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Добавлено:</span>
                          <span className="text-gray-900">{formatDate(plant.date_added)}</span>
                        </div>
                      </div>
                      
                      {plant.notes && (
                        <div className="mt-4 p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-700">{plant.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌱</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Ваша коллекция пуста</h3>
                  <p className="text-gray-600 mb-6">Начните с поиска и добавления своих первых растений!</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Найти растения
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⏰ Напоминания</h2>
              
              {reminders.length > 0 ? (
                <div className="space-y-4">
                  {reminders.map((reminder) => {
                    const urgency = getReminderUrgency(reminder.due_date);
                    return (
                      <div 
                        key={reminder.id} 
                        className={`p-4 rounded-lg border-l-4 ${
                          urgency === 'urgent' ? 'bg-red-50 border-red-500' :
                          urgency === 'soon' ? 'bg-yellow-50 border-yellow-500' :
                          'bg-green-50 border-green-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {getReminderTypeText(reminder.reminder_type)} - {reminder.plant_nickname}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Срок: {formatDate(reminder.due_date)}
                            </p>
                            {urgency === 'urgent' && (
                              <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                🚨 Просрочено!
                              </span>
                            )}
                            {urgency === 'soon' && (
                              <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                ⚠️ Скоро!
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => completeReminder(reminder.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Выполнено ✓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Все напоминания выполнены!</h3>
                  <p className="text-gray-600">Отличная работа! Ваши растения будут вам благодарны.</p>
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