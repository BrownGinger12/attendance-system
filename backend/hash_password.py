"""
Simple password hasher for testing purposes only.
Usage: python hash_password.py <password>
"""
import bcrypt
import sys


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python hash_password.py <password>")
        sys.exit(1)

    hashed = hash_password(sys.argv[1])
    print(hashed)
