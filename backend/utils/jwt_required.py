from functools import wraps
from flask import request, jsonify
from model.employee import Employee
from dotenv import load_dotenv
import jwt
import os

load_dotenv()


def employee_jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if "x-access-token" in request.headers:
            token = request.headers["x-access-token"]

        if not token:
            return jsonify({"error": "Token is missing!"}), 401

        try:
            secret = os.getenv("JWT_SECRET", "dev-secret-key")
            print(f"[JWT] secret='{secret}' | token[:30]='{token[:30]}'")
            data = jwt.decode(token, secret, algorithms=["HS256"])
            print(f"[JWT] decoded payload: {data}")
            current_employee = Employee.get_by_id(int(data["sub"]))

            if current_employee.get("statusCode") != 200:
                return jsonify({"error": "Employee not found!"}), 404

            employee_data = current_employee["data"]
            if "PASSWORD" in employee_data:
                del employee_data["PASSWORD"]

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired!"}), 401
        except jwt.DecodeError as e:
            print(f"[JWT] DecodeError: {e}")
            return jsonify({"error": f"Token decode error: {str(e)}"}), 401
        except jwt.InvalidSignatureError as e:
            print(f"[JWT] InvalidSignatureError: {e}")
            return jsonify({"error": "Token signature mismatch — log out and log in again"}), 401
        except jwt.InvalidTokenError as e:
            print(f"[JWT] InvalidTokenError ({type(e).__name__}): {e}")
            return jsonify({"error": f"Invalid token ({type(e).__name__}): {str(e)}"}), 401
        except Exception as e:
            print(f"[JWT] Unexpected error ({type(e).__name__}): {e}")
            return jsonify({"error": str(e)}), 500

        return f(employee_data, *args, **kwargs)

    return decorated
