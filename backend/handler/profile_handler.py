import os
import uuid
from flask import request, jsonify, send_from_directory
from model.employee import Employee

AVATAR_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "avatars")
os.makedirs(AVATAR_FOLDER, exist_ok=True)

_ALLOWED_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}


def get_profile(current_employee):
    try:
        user_id = int(current_employee["userid"])
        avatar_url = Employee.get_avatar(user_id)
        return jsonify({
            "statusCode": 200,
            "name": current_employee["Name"],
            "badge": current_employee["Badgenumber"],
            "avatar_url": avatar_url,
            "role": current_employee.get("role"),
            "dept_id": current_employee.get("DEFAULTDEPTID") or current_employee.get("defaultdeptid"),
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def update_profile_name(current_employee):
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "Name is required"}), 400
        user_id = int(current_employee["userid"])
        result = Employee.update_name(user_id, name)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def update_profile_avatar(current_employee):
    try:
        file = request.files.get("avatar")
        if not file or not file.filename:
            return jsonify({"message": "No file provided"}), 400
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in _ALLOWED_EXTS:
            return jsonify({"message": "Only image files are allowed (jpg, png, gif, webp)"}), 400
        user_id = int(current_employee["userid"])
        stored_name = f"{uuid.uuid4().hex}.{ext}"
        file.save(os.path.join(AVATAR_FOLDER, stored_name))
        avatar_url = f"/uploads/avatars/{stored_name}"
        result = Employee.upsert_avatar(user_id, avatar_url)
        if result["statusCode"] == 200:
            return jsonify({"statusCode": 200, "avatar_url": avatar_url}), 200
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def change_profile_password(current_employee):
    try:
        data = request.get_json(silent=True) or {}
        old_password = data.get("old_password", "")
        new_password = data.get("new_password", "")
        if not old_password or not new_password:
            return jsonify({"message": "old_password and new_password are required"}), 400
        badge = current_employee["badgenumber"]
        result = Employee.change_password(badge, old_password, new_password)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def serve_avatar(filename: str):
    return send_from_directory(AVATAR_FOLDER, filename)
