# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import threading
from datetime import datetime, date, time as dtime

from handler.dtr_generator_handler import fill_dtr_document
from handler.employee_handler import (
    delete_employee,
    export_employees_to_excel,
    get_employee_by_id,
    get_employees_paginated,
    get_total_employee_pages,
    get_user_fingerprints,
    search_employees,
    update_employee,
    get_employee_count
)
from handler.attendance_record_handler import (
    get_attendance_month,
    get_attendance_day,
    get_attendance_employee
)
from handler.department_handler import get_departments, get_department_by_id
from handler.attendance_watcher_handler import AttendanceWatcher

# ------------------------------
# Flask + SocketIO setup
# ------------------------------
app = Flask(__name__)
CORS(app)

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

# ------------------------------
# DTR Export endpoint
# ------------------------------
@app.route('/api/fill-dtr-json', methods=['POST'])
def fill_dtr_json():
    try:
        json_data = request.get_json()
        if not json_data or 'name' not in json_data or 'data' not in json_data:
            return jsonify({'error': 'JSON must contain "name" and "data"'}), 400

        template_path = "dtr/template/dtr-temp.docx"
        if not os.path.exists(template_path):
            return jsonify({'error': f'Template not found: {template_path}'}), 404

        filled_doc, employee_name, month_name, attendance_days = fill_dtr_document(template_path, json_data)

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
        return jsonify({'error': str(e)}), 500

# ------------------------------
# Run the app
# ------------------------------
if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
