# app.py
import subprocess
import hashlib
import hmac
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import time
import threading
from datetime import datetime, date, time as dtime

from handler.dtr_generator_handler import fill_dtr_document, fill_dtr_document_from_data
from utils.jwt_required import employee_jwt_required
from handler.profile_handler import (
    get_profile, update_profile_name, update_profile_avatar,
    change_profile_password, serve_avatar,
)
from handler.employee_handler import (
    delete_employee,
    export_employees_to_excel,
    get_employee_by_id,
    get_employees_paginated,
    get_total_employee_pages,
    get_user_fingerprints,
    search_employees,
    update_employee,
    get_employee_count,
    get_employee_by_badge,
    get_employees_by_department,
    login_employee,
    checkin_employee,
    checkout_employee,
)
from handler.attendance_record_handler import (
    get_attendance_month,
    get_attendance_day,
    get_attendance_employee,
    edit_attendance
)
from handler.employee_stats_handler import (
    get_stats_employee,
    get_stats_month,
    get_all_employees_summary,
    get_employee_detailed_stats
)

from handler.accomplishment_handler import (
    create_accomplishment,
    get_all_accomplishments,
    get_user_accomplishments,
    get_accomplishment_by_id,
    update_accomplishment,
    delete_accomplishment,
    add_files_to_accomplishment,
    delete_file_from_accomplishment,
    serve_accomplishment_upload,
)
from handler.department_handler import get_departments, get_department_by_id
from handler.sub_department_handler import (
    get_my_sub_department,
    create_sub_department,
    rename_sub_department,
    add_member,
    remove_member,
    search_candidates,
    get_membership,
)
from handler.attendance_watcher_handler import AttendanceWatcher

# ------------------------------
# Flask + SocketIO setup
# ------------------------------
app = Flask(__name__)
CORS(app)

@app.after_request
def apply_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
ATTENDANCE_NS = '/attendance'

# ------------------------------
# Attendance Watcher
# ------------------------------
watcher = AttendanceWatcher(socketio, namespace=ATTENDANCE_NS)

# Start watcher in a separate daemon thread
threading.Thread(target=watcher.start, daemon=True).start()

# ------------------------------
# WebSocket events
# ------------------------------
@socketio.on('connect', namespace=ATTENDANCE_NS)
def on_connect():
    print("Attendance socket connected")
    emit("status", {"message": "Connected to attendance namespace"})

    try:
        # Fetch today's attendance from SQL
        rows = watcher.get_today_attendance()

        # Convert CHECKTIME to ISO string for all rows
        for r in rows:
            if isinstance(r.get("checktime"), datetime):
                r["checktime"] = r["checktime"].isoformat()

        # Emit all today's attendance to the client
        emit("attendance:init", rows)
        print(f"Sent {len(rows)} attendance records to client.")

    except Exception as e:
        print("Error fetching today's attendance:", e)
        emit("attendance:init", [])

@socketio.on('disconnect', namespace=ATTENDANCE_NS)
def on_disconnect():
    print("Attendance socket disconnected")

# ------------------------------
# Department endpoints
# ------------------------------
@app.route("/departments", methods=["GET"])
def departments():
    return get_departments()

@app.route("/department/<int:dept_id>", methods=["GET"])
def department(dept_id):
    return get_department_by_id(dept_id)

# ------------------------------
# Sub-department endpoints
# ------------------------------
@app.route("/sub-department/my", methods=["GET"])
@employee_jwt_required
def sub_department_my(current_employee):
    return get_my_sub_department(current_employee)

@app.route("/sub-department", methods=["POST"])
@employee_jwt_required
def sub_department_create(current_employee):
    return create_sub_department(current_employee)

@app.route("/sub-department/<int:sub_dept_id>", methods=["PUT"])
@employee_jwt_required
def sub_department_rename(current_employee, sub_dept_id):
    return rename_sub_department(current_employee, sub_dept_id)

@app.route("/sub-department/<int:sub_dept_id>/members", methods=["POST"])
@employee_jwt_required
def sub_department_add_member(current_employee, sub_dept_id):
    return add_member(current_employee, sub_dept_id)

@app.route("/sub-department/<int:sub_dept_id>/members/<int:employee_id>", methods=["DELETE"])
@employee_jwt_required
def sub_department_remove_member(current_employee, sub_dept_id, employee_id):
    return remove_member(current_employee, sub_dept_id, employee_id)

@app.route("/sub-department/<int:sub_dept_id>/candidates", methods=["GET"])
@employee_jwt_required
def sub_department_candidates(current_employee, sub_dept_id):
    return search_candidates(current_employee, sub_dept_id)

@app.route("/sub-department/membership", methods=["GET"])
@employee_jwt_required
def sub_department_membership(current_employee):
    return get_membership(current_employee)

# ------------------------------
# Employee endpoints
# ------------------------------
@app.route("/employees", methods=["GET"])
def employees():
    return get_employees_paginated()

@app.route("/employee/<int:user_id>", methods=["GET"])
def employee(user_id):
    return get_employee_by_id(user_id)

@app.route("/employees/pages", methods=["GET"])
def employees_total_pages():
    return get_total_employee_pages()

@app.route("/employee/<int:user_id>", methods=["PUT"])
def update_employee_api(user_id):
    return update_employee(user_id)

@app.route("/employees/count", methods=["GET"])
def employees_count():
    return get_employee_count()

@app.route('/employee/<int:user_id>', methods=['DELETE'])
def delete_employee_route(user_id):
    return delete_employee(user_id)

@app.route('/employees/search', methods=['GET'])
def search_employees_route():
    return search_employees()

@app.route('/employees/<int:user_id>/fingerprints', methods=['GET'])
def get_fingerprints_route(user_id):
    return get_user_fingerprints(user_id)

@app.route('/employees/export/excel', methods=['GET'])
def export_excel_route():
    return export_employees_to_excel()

@app.route("/employee/badge", methods=["GET"])
def employee_by_badge_route():
    return get_employee_by_badge()

@app.route("/employee/login", methods=["POST"])
def employee_login_route():
    return login_employee()

@app.route("/employee/checkin", methods=["POST"])
@employee_jwt_required
def employee_checkin_route(current_employee):
    return checkin_employee(current_employee)

@app.route("/employee/checkout", methods=["POST"])
@employee_jwt_required
def employee_checkout_route(current_employee):
    return checkout_employee(current_employee)

@app.route("/employees/department/<int:dept_id>", methods=["GET"])
def employees_by_department_route(dept_id):
    return get_employees_by_department(dept_id)

# ------------------------------
# Attendance endpoints
# ------------------------------
@app.route("/attendance/employee", methods=["GET"])
def attendance_employee():
    return get_attendance_employee()

@app.route("/attendance/month", methods=["GET"])
def attendance_month():
    return get_attendance_month()

@app.route("/attendance/day", methods=["GET"])
def attendance_day():
    return get_attendance_day()

@app.route("/attendance/<int:record_id>", methods=["PUT"])
def attendance_edit(record_id):
    return edit_attendance(record_id)

# ------------------------------
# Accomplishment endpoints
# ------------------------------
@app.route("/accomplishments", methods=["POST"])
@employee_jwt_required
def create_accomplishment_route(current_employee):
    return create_accomplishment(current_employee)

@app.route("/accomplishments", methods=["GET"])
def get_all_accomplishments_route():
    return get_all_accomplishments()

@app.route("/accomplishments/user/<int:user_id>", methods=["GET"])
def get_user_accomplishments_route(user_id):
    return get_user_accomplishments(user_id)

@app.route("/accomplishments/<int:post_id>", methods=["GET"])
def get_accomplishment_route(post_id):
    return get_accomplishment_by_id(post_id)

@app.route("/accomplishments/<int:post_id>", methods=["PUT"])
@employee_jwt_required
def update_accomplishment_route(current_employee, post_id):
    return update_accomplishment(post_id, current_employee)

@app.route("/accomplishments/<int:post_id>", methods=["DELETE"])
@employee_jwt_required
def delete_accomplishment_route(current_employee, post_id):
    return delete_accomplishment(post_id, current_employee)

@app.route("/accomplishments/<int:post_id>/files", methods=["POST"])
@employee_jwt_required
def add_files_route(current_employee, post_id):
    return add_files_to_accomplishment(post_id, current_employee)

@app.route("/accomplishments/<int:post_id>/files/<int:file_id>", methods=["DELETE"])
@employee_jwt_required
def delete_file_route(current_employee, post_id, file_id):
    return delete_file_from_accomplishment(post_id, file_id, current_employee)

@app.route("/uploads/accomplishments/<path:filename>", methods=["GET"])
def serve_upload_route(filename):
    return serve_accomplishment_upload(filename)

# ------------------------------
# Profile endpoints
# ------------------------------
@app.route("/employee/profile", methods=["GET"])
@employee_jwt_required
def get_profile_route(current_employee):
    return get_profile(current_employee)

@app.route("/employee/profile/name", methods=["PUT"])
@employee_jwt_required
def update_profile_name_route(current_employee):
    return update_profile_name(current_employee)

@app.route("/employee/profile/avatar", methods=["PUT"])
@employee_jwt_required
def update_profile_avatar_route(current_employee):
    return update_profile_avatar(current_employee)

@app.route("/employee/profile/password", methods=["PUT"])
@employee_jwt_required
def change_profile_password_route(current_employee):
    return change_profile_password(current_employee)

@app.route("/uploads/avatars/<path:filename>", methods=["GET"])
def serve_avatar_route(filename):
    return serve_avatar(filename)

# ------------------------------
# Employee stats endpoints
# ------------------------------
# Employee Daily Stats Routes
@app.route("/employee-stats/month", methods=["GET"])
def employee_stats_month():
    return get_stats_month()

@app.route("/employee-stats/employee", methods=["GET"])
def employee_stats_employee():
    return get_stats_employee()

@app.route("/employee-stats/summary", methods=["GET"])
def employee_stats_summary():
    return get_all_employees_summary()

@app.route("/employee-stats/detailed", methods=["GET"])
def employee_stats_detailed():
    return get_employee_detailed_stats()

# ------------------------------
# DTR Export endpoint
# ------------------------------
# FIXED API ROUTE - Replace your existing /api/fill-dtr-json endpoint with this:

@app.route('/api/fill-dtr-json', methods=['POST'])
def fill_dtr_json():
    try:
        json_data = request.get_json()
        if not json_data or 'name' not in json_data or 'data' not in json_data:
            return jsonify({'error': 'JSON must contain "name" and "data"'}), 400

        template_path = "dtr/template/dtr-temp.docx"
        if not os.path.exists(template_path):
            return jsonify({'error': f'Template not found: {template_path}'}), 404

        employee_name = json_data.get('name', 'Unknown')

        # Use the new function that accepts data directly
        filled_doc, employee_name, month_name, attendance_days = fill_dtr_document_from_data(
            template_path, 
            json_data,
            employee_name
        )

        from io import BytesIO
        doc_buffer = BytesIO()
        filled_doc.save(doc_buffer)
        doc_buffer.seek(0)

        output_filename = f"DTR_{employee_name.replace(' ', '_')}_{month_name.replace(' ', '_')}.docx"

        return send_file(
            doc_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=output_filename
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())  # This will help debug
        return jsonify({'error': str(e)}), 500
    

# ------------------------------
# Health check endpoint
# ------------------------------
@app.get("/")
def read_root():
    return {"message": "server health check!"}, 200


# ------------------------------
# GitHub Webhook for Auto-Update
# ------------------------------
GITHUB_SECRET = os.getenv("WEBHOOK_SECRET")

@app.route("/update", methods=["POST"])
def update_code():
    auth_header = request.headers.get("Authorization", "")
    expected = f"Bearer {GITHUB_SECRET}"

    if auth_header != expected:
        return jsonify({"status": "unauthorized"}), 401

    try:
        # Pull the latest code from the GitHub repository
        result = subprocess.run(
            ["git", "pull", "origin", "main"],  # replace 'main' with your default branch if needed
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            # Git pull failed
            return jsonify({
                "status": "error",
                "message": result.stderr
            }), 500

        # Optionally: restart the app here if needed
        # WARNING: auto-restart in production may require a process manager like Gunicorn, PM2, or systemd

        return jsonify({
            "status": "success",
            "message": result.stdout
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ------------------------------
# Run the app
# ------------------------------
if __name__ == "__main__":
    is_ci = os.getenv("CI") == "true"

    socketio.run(
        app,
        debug=True,
        host="0.0.0.0",
        port=5000,
        allow_unsafe_werkzeug=is_ci
    )