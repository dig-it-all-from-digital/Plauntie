#!/usr/bin/env python3
"""
PlantCare Assistant Backend API Testing
Tests all major endpoints and functionality
"""

import requests
import sys
import json
import io
from datetime import datetime
from PIL import Image

class PlantCareAPITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = "demo-user"
        self.test_plant_id = None
        self.test_reminder_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f" | Message: {data.get('message', 'No message')}"
            return self.log_test("API Root", success, details)
        except Exception as e:
            return self.log_test("API Root", False, f"Error: {str(e)}")

    def test_plant_search(self):
        """Test plant search functionality"""
        test_queries = ["роза", "фиалка", "кактус", "фикус"]
        
        for query in test_queries:
            try:
                response = requests.get(f"{self.api_url}/plants/search", 
                                      params={"q": query}, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    plant_count = len(data)
                    details = f"Query: '{query}' | Found: {plant_count} plants"
                    
                    # Store first plant ID for later tests
                    if plant_count > 0 and not self.test_plant_id:
                        self.test_plant_id = data[0].get('id')
                        details += f" | Stored plant ID: {self.test_plant_id}"
                else:
                    details = f"Query: '{query}' | Status: {response.status_code}"
                
                self.log_test(f"Plant Search - {query}", success, details)
                
            except Exception as e:
                self.log_test(f"Plant Search - {query}", False, f"Error: {str(e)}")

    def test_plant_care_info(self):
        """Test getting plant care information"""
        if not self.test_plant_id:
            return self.log_test("Plant Care Info", False, "No plant ID available from search")
        
        try:
            response = requests.get(f"{self.api_url}/plants/{self.test_plant_id}/care", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Plant: {data.get('name', 'Unknown')} | Scientific: {data.get('scientific_name', 'Unknown')}"
                # Check if care info is present
                care_fields = ['watering', 'sunlight', 'temperature', 'humidity']
                present_fields = [field for field in care_fields if data.get(field)]
                details += f" | Care fields: {len(present_fields)}/{len(care_fields)}"
            else:
                details = f"Status: {response.status_code}"
            
            return self.log_test("Plant Care Info", success, details)
            
        except Exception as e:
            return self.log_test("Plant Care Info", False, f"Error: {str(e)}")

    def test_chat(self):
        """Test the chat endpoint"""
        try:
            payload = {"message": "Привет! Как дела?", "enable_web_search": False}
            response = requests.post(f"{self.api_url}/chat", json=payload, timeout=30)

            success = response.status_code == 200 and 'response' in response.json()

            if success:
                data = response.json()
                details = f"Plauntie replied: '{data.get('response', '')[:50]}...'"
            else:
                details = f"Status: {response.status_code}"

            return self.log_test("Chat Endpoint", success, details)
        except Exception as e:
            return self.log_test("Chat Endpoint", False, f"Error: {str(e)}")

    def test_plant_identification(self):
        """Test plant identification with a sample image"""
        try:
            img = Image.new('RGB', (300, 300), color='green')
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='JPEG')
            img_buffer.seek(0)
            
            files = {'file': ('test_plant.jpg', img_buffer, 'image/jpeg')}
            response = requests.post(f"{self.api_url}/plants/identify", 
                                   files=files, timeout=30) # Increased timeout for LLM
            
            success = response.status_code == 200 and 'plauntie_description' in response.json()
            
            if success:
                data = response.json()
                details = f"Plauntie says: '{data.get('plauntie_description', '')[:50]}...'"
            else:
                details = f"Status: {response.status_code}"
                if response.status_code == 200:
                    details += " | 'plauntie_description' field missing."
                else:
                    try:
                        error_data = response.json()
                        details += f" | Error: {error_data.get('detail', 'Unknown error')}"
                    except:
                        details += f" | Response: {response.text[:100]}"
            
            return self.log_test("Plant Identification (LLM Enhanced)", success, details)

        except Exception as e:
            return self.log_test("Plant Identification (LLM Enhanced)", False, f"Error: {str(e)}")

    def test_plant_diagnosis(self):
        """Test plant diagnosis with a sample image"""
        try:
            # Create a simple test image (e.g., with a brown spot)
            img = Image.new('RGB', (300, 300), color='green')
            for x in range(100, 150):
                for y in range(100, 150):
                    img.putpixel((x, y), (139, 69, 19)) # Brown color

            img_buffer = io.BytesIO()
            img.save(img_buffer, format='JPEG')
            img_buffer.seek(0)

            files = {'file': ('sick_plant.jpg', img_buffer, 'image/jpeg')}
            response = requests.post(f"{self.api_url}/plants/diagnose",
                                   files=files, timeout=30)

            success = response.status_code == 200 and 'diagnosis_text' in response.json()

            if success:
                data = response.json()
                details = f"Diagnosis: '{data.get('diagnosis_text', '')[:50]}...'"
            else:
                details = f"Status: {response.status_code}"

            return self.log_test("Plant Diagnosis", success, details)
            
        except Exception as e:
            return self.log_test("Plant Diagnosis", False, f"Error: {str(e)}")

    def test_add_user_plant(self):
        """Test adding a plant to user collection"""
        if not self.test_plant_id:
            return self.log_test("Add User Plant", False, "No plant ID available")
        
        try:
            plant_data = {
                "plant_id": self.test_plant_id,
                "nickname": "Тестовое растение",
                "plant_name": "Test Plant",
                "scientific_name": "Testus plantus",
                "watering_frequency_days": 7,
                "fertilizing_frequency_days": 30,
                "notes": "Добавлено для тестирования",
                "image_url": "https://example.com/test.jpg"
            }
            
            response = requests.post(f"{self.api_url}/user/{self.user_id}/plants", 
                                   json=plant_data, timeout=15)
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Added: {data.get('nickname', 'Unknown')} | ID: {data.get('id', 'Unknown')}"
            else:
                details = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    details += f" | Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" | Response: {response.text[:100]}"
            
            return self.log_test("Add User Plant", success, details)
            
        except Exception as e:
            return self.log_test("Add User Plant", False, f"Error: {str(e)}")

    def test_get_user_plants(self):
        """Test getting user's plant collection"""
        try:
            response = requests.get(f"{self.api_url}/user/{self.user_id}/plants", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                plant_count = len(data)
                details = f"Plants in collection: {plant_count}"
                if plant_count > 0:
                    sample_plant = data[0]
                    details += f" | Sample: {sample_plant.get('nickname', 'Unknown')}"
            else:
                details = f"Status: {response.status_code}"
            
            return self.log_test("Get User Plants", success, details)
            
        except Exception as e:
            return self.log_test("Get User Plants", False, f"Error: {str(e)}")

    def test_get_user_reminders(self):
        """Test getting user reminders"""
        try:
            response = requests.get(f"{self.api_url}/user/{self.user_id}/reminders", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                reminder_count = len(data)
                details = f"Active reminders: {reminder_count}"
                if reminder_count > 0:
                    self.test_reminder_id = data[0].get('id')
                    reminder_type = data[0].get('reminder_type', 'unknown')
                    plant_name = data[0].get('plant_nickname', 'Unknown')
                    details += f" | Sample: {reminder_type} for {plant_name}"
            else:
                details = f"Status: {response.status_code}"
            
            return self.log_test("Get User Reminders", success, details)
            
        except Exception as e:
            return self.log_test("Get User Reminders", False, f"Error: {str(e)}")

    def test_complete_reminder(self):
        """Test completing a reminder"""
        if not self.test_reminder_id:
            return self.log_test("Complete Reminder", False, "No reminder ID available")
        
        try:
            response = requests.post(f"{self.api_url}/user/{self.user_id}/reminders/{self.test_reminder_id}/complete", 
                                   timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Message: {data.get('message', 'Completed successfully')}"
            else:
                details = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    details += f" | Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" | Response: {response.text[:100]}"
            
            return self.log_test("Complete Reminder", success, details)
            
        except Exception as e:
            return self.log_test("Complete Reminder", False, f"Error: {str(e)}")

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        test_cases = [
            ("Empty search query", f"{self.api_url}/plants/search?q=", 400),
            ("Invalid plant ID", f"{self.api_url}/plants/invalid-id/care", 404),
            ("Non-existent user", f"{self.api_url}/user/non-existent/plants", 200),  # Should return empty list
        ]
        
        for test_name, url, expected_status in test_cases:
            try:
                response = requests.get(url, timeout=10)
                success = response.status_code == expected_status
                details = f"Expected: {expected_status} | Got: {response.status_code}"
                self.log_test(f"Error Handling - {test_name}", success, details)
            except Exception as e:
                self.log_test(f"Error Handling - {test_name}", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🌿 Starting PlantCare Assistant Backend API Tests")
        print("=" * 60)
        
        self.test_api_root()
        
        # Test new AI features
        self.test_chat()
        self.test_plant_identification()
        self.test_plant_diagnosis()

        # Test existing features
        self.test_plant_search()
        self.test_plant_care_info()
        self.test_add_user_plant()
        self.test_get_user_plants()
        self.test_get_user_reminders()
        self.test_complete_reminder()
        self.test_invalid_endpoints()
        
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the issues above.")
            return 1

def main():
    """Main test runner"""
    tester = PlantCareAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())