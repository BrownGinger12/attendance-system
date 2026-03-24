import os
import uuid
from flask import request, jsonify, send_from_directory
from model.accomplishment import Accomplishment

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "accomplishments")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

_EXT_TO_TYPE = {
    **{ext: "image"    for ext in ("jpg", "jpeg", "png", "gif", "webp", "bmp", "svg")},
    **{ext: "video"    for ext in ("mp4", "mov", "avi", "mkv", "webm")},
    **{ext: "document" for ext in ("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv")},
}

def _file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _EXT_TO_TYPE.get(ext, "other")

def _save_upload(file) -> tuple:
    """Save file to disk. Returns (url, original_name, size_bytes)."""
    original = file.filename or "file"
    ext = original.rsplit(".", 1)[-1].lower() if "." in original else ""
    stored_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    path = os.path.join(UPLOAD_FOLDER, stored_name)
    file.save(path)
    return f"/uploads/accomplishments/{stored_name}", original, os.path.getsize(path)


# ── CREATE ──────────────────────────────────────────────────────────────────

def create_accomplishment(current_employee):
    try:
        content = (request.form.get("content") or "").strip()
        if not content:
            return jsonify({"message": "Content is required"}), 400

        user_id = int(current_employee["userid"])
        result = Accomplishment.create(user_id, content)
        if result["statusCode"] != 201:
            return jsonify(result), result["statusCode"]

        post_id = result["id"]

        for file in request.files.getlist("files"):
            if not file or not file.filename:
                continue
            url, name, size = _save_upload(file)
            Accomplishment.add_file(post_id, url, _file_type(name), name, size)

        post = Accomplishment.get_by_id(post_id)
        return jsonify(post), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ── READ ─────────────────────────────────────────────────────────────────────

def get_all_accomplishments():
    try:
        page  = request.args.get("page",  default=1,  type=int)
        limit = request.args.get("limit", default=10, type=int)
        result = Accomplishment.get_all(page=page, limit=limit)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def get_user_accomplishments(user_id: int):
    try:
        page  = request.args.get("page",  default=1,  type=int)
        limit = request.args.get("limit", default=50, type=int)
        result = Accomplishment.get_by_user(user_id=user_id, page=page, limit=limit)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def get_accomplishment_by_id(post_id: int):
    try:
        result = Accomplishment.get_by_id(post_id)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ── UPDATE ───────────────────────────────────────────────────────────────────

def update_accomplishment(post_id: int, current_employee):
    try:
        data = request.get_json(silent=True) or {}
        content = (data.get("content") or "").strip()
        if not content:
            return jsonify({"message": "Content is required"}), 400

        user_id = int(current_employee["userid"])
        result = Accomplishment.update(post_id, user_id, content)
        return jsonify(result), result["statusCode"]

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ── DELETE ───────────────────────────────────────────────────────────────────

def delete_accomplishment(post_id: int, current_employee):
    try:
        user_id = int(current_employee["userid"])
        result = Accomplishment.delete(post_id, user_id)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ── FILES ────────────────────────────────────────────────────────────────────

def add_files_to_accomplishment(post_id: int, current_employee):
    try:
        files = [f for f in request.files.getlist("files") if f and f.filename]
        if not files:
            return jsonify({"message": "No files provided"}), 400

        added_ids = []
        for file in files:
            url, name, size = _save_upload(file)
            r = Accomplishment.add_file(post_id, url, _file_type(name), name, size)
            if r["statusCode"] == 201:
                added_ids.append(r["id"])

        return jsonify({"statusCode": 201, "message": f"{len(added_ids)} file(s) added", "file_ids": added_ids}), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


def delete_file_from_accomplishment(post_id: int, file_id: int, current_employee):
    try:
        user_id = int(current_employee["userid"])
        result = Accomplishment.delete_file(file_id, post_id, user_id)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ── STATIC FILE SERVING ──────────────────────────────────────────────────────

def serve_accomplishment_upload(filename: str):
    return send_from_directory(UPLOAD_FOLDER, filename)
