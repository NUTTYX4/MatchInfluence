import requests

BASE_URL = "http://localhost:8000"

def test_api():
    print("Testing API...")
    
    # 1. Register
    print("\n--- Register ---")
    try:
        res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": "test99@example.com",
            "password": "Password123!",
            "full_name": "Test User",
            "recaptcha_token": "dev_bypass"
        })
        print(f"Status: {res.status_code}")
        print(res.json())
    except Exception as e:
        print(f"Error: {e}")

    # 2. Login
    print("\n--- Login ---")
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "test99@example.com",
            "password": "Password123!",
            "recaptcha_token": "dev_bypass"
        })
        print(f"Status: {res.status_code}")
        print(res.json())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
