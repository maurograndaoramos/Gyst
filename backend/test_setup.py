#!/usr/bin/env python3
"""Simple script to test if all dependencies are working correctly."""

def test_imports():
    """Test that all required modules can be imported."""
    try:
        import pytest
        print("✅ pytest imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import pytest: {e}")
        return False
    
    try:
        import fastapi
        print("✅ fastapi imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import fastapi: {e}")
        return False
    
    try:
        import httpx
        print("✅ httpx imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import httpx: {e}")
        return False
    
    try:
        from fastapi.testclient import TestClient
        print("✅ TestClient imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import TestClient: {e}")
        return False
    
    return True

def test_basic_functionality():
    """Test basic pytest functionality."""
    def dummy_test():
        assert 1 + 1 == 2
        return True
    
    try:
        result = dummy_test()
        print("✅ Basic test assertion works")
        return True
    except Exception as e:
        print(f"❌ Basic test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing pytest setup...\n")
    
    imports_ok = test_imports()
    basic_ok = test_basic_functionality()
    
    if imports_ok and basic_ok:
        print("\n🎉 All tests passed! Pytest setup is working correctly.")
        print("\nNext steps:")
        print("1. Install test dependencies: uv pip install -e .[test]")
        print("2. Run tests: python -m pytest backend/tests/ -v")
    else:
        print("\n❌ Some tests failed. Please check your environment setup.")
        print("\nTroubleshooting:")
        print("1. Make sure you're in the correct virtual environment")
        print("2. Install dependencies: uv pip install -e .[test]")
        print("3. Verify uv is working: uv --version")
