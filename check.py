import requests
import os
import sys
import io

# Fix console encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# API_KEY = "AIzaSyDBWxTbLmHAji23aLJUczlEcVvZLFTtbAc"
API_KEY = "AIzaSyDIkPSqlQZeAqCpv7KgnMIexaghNW-Wews"

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def check_model_usage(model, prompt="Hello!"):
    url = f"{BASE_URL}/models/{model}:generateContent?key={API_KEY}"
    data = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ]
    }
    try:
        resp = requests.post(url, json=data)
        status = resp.status_code
        print(f"{model} -> {status}")
        if status == 200:
            print("  [OK] Model responded successfully.")
        else:
            print("  [FAIL] Error:", resp.json())
    except Exception as e:
        print(f"{model} -> Exception:", str(e))


def check_embedding(model, text="Test text"):
    url = f"{BASE_URL}/models/{model}:embedContent?key={API_KEY}"
    data = {
        "model": f"models/{model}",
        "content": {
            "parts": [{"text": text}]
        }
    }
    try:
        resp = requests.post(url, json=data)
        status = resp.status_code
        print(f"{model} (embedding) -> {status}")
        if status == 200:
            print("  [OK] Embedding returned.")
        else:
            print("  [FAIL] Error:", resp.json())
    except Exception as e:
        print(f"{model} -> Exception:", str(e))


if __name__ == "__main__":
    if not API_KEY:
        print("Set your GEMINI_API_KEY env variable first!")
        exit(1)

    print("Testing text generation models...")
    check_model_usage("gemini-2.5-flash")
    check_model_usage("gemini-2.5-flash-lite")

    print("\nTesting embedding model...")
    check_embedding("gemini-embedding-001")