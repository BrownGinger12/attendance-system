# app.py
import os
import threading
import time
import shutil
import tempfile
from datetime import datetime, date, time as dtime

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import pyodbc
from dotenv import load_dotenv

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

# ------------------------------
# Load env and DB config
# ------------------------------
load_dotenv()
DB_PATH = os.getenv("ACCESS_DB_PATH")
DRIVER = "Microsoft Access Driver (*.mdb, *.accdb)"

# ------------------------------
# Robust Access DB helper
# ------------------------------
def get_connection(readonly=True):
    """
    Connect to the Access DB.
    If readonly=True, creates a temp copy to avoid file locks.
    Returns (conn, tmp_file_path)
    """
    tmp_file_path = None
    if readonly:
        tmp_file = tempfile.NamedTemporaryFile(suffix=".accdb", delete=False)
        shutil.copyfile(DB_PATH, tmp_file.name)
        tmp_file_path = tmp_file.name
        conn_str = f"DRIVER={{{DRIVER}}};DBQ={tmp_file.name};ReadOnly=True;"
        conn = pyodbc.connect(conn_str, autocommit=True)
    else:
        conn_str = f"DRIVER={{{DRIVER}}};DBQ={DB_PATH};ReadOnly=False;"
        conn = pyodbc.connect(conn_str, autocommit=True)
    return conn, tmp_file_path

def fetch_query(sql, params=None):
    """
    Execute a SELECT query safely from Access DB
    """
    conn, tmp_file_path = get_connection(readonly=True)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or [])
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
        if tmp_file_path:
            os.remove(tmp_file_path)

def query(sql, params=None):
    """
    Execute INSERT/UPDATE/DELETE queries
    """
    conn, tmp_file_path = get_connection(readonly=False)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or [])
        conn.commit()
        return {"statusCode": 200, "message": "Query executed successfully"}
    except pyodbc.Error as err:
        return {"statusCode": 500, "message": str(err)}
    finally:
        cursor.close()
        conn.close()
        if tmp_file_path:
            os.remove(tmp_file_path)

# ------------------------------
# Flask + SocketIO setup
# ------------------------------
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
ATTENDANCE_NS = '/attendance'

# ------------------------------
# AttendanceWatcher
# ------------------------------
class AttendanceWatcher:
    def __init__(self, socketio, namespace=ATTENDANCE_NS):
        self.socketio = socketio
        self.namespace = namespace
        self.running = True
        self.last_rows = []

    def start(self):
        while self.running:
            try:
                rows = fetch_query("SELECT * FROM ATTENDANCE ORDER BY CHECKTIME DESC")
                if rows != self.last_rows:
                    # Convert CHECKTIME to ISO string
                    for r in rows:
                        if isinstance(r.get("CHECKTIME"), datetime):
                            r["CHECKTIME"] = r["CHECKTIME"].isoformat()
                    self.socketio.emit("attendance:update", rows, namespace=self.namespace)
                    self.last_rows = rows
            except Exception as e:
                print("Attendance watcher error:", e)
            time.sleep(3)  # poll every 3 seconds

    def get_today_attendance(self):
        try:
            today_str = date.today().strftime("%Y-%m-%d")
            sql = f"SELECT * FROM ATTENDANCE WHERE FORMAT(CHECKTIME,'yyyy-mm-dd')='{today_str}'"
            return fetch_query(sql)
        except Exception as e:
            print("Attendance watcher error:", e)
            return []

watcher = AttendanceWatcher(socketio, namespace=ATTENDANCE_NS)
threading.Thread(target=watcher.start, daemon=True).start()

# ------------------------------
# WebSocket events
# ------------------------------
@socketio.on('connect', namespace=ATTENDANCE_NS)
def on_connect():
    print("Attendance socket connected")
    emit("status", {"message": "Connected to attendance namespace"})

    # Send today's attendance on connect
    rows = watcher.get_today_attendance()
    for r in rows:
        if isinstance(r.get("CHECKTIME"), datetime):
            r["CHECKTIME"] = r["CHECKTIME"].isoformat()
    emit("attendance:init", rows)

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
# DTR Export
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
# Run app
# ------------------------------
if __name__ == "__main__":
    socketio.run(app, debug=False, use_reloader=False, host="0.0.0.0", port=5000)
