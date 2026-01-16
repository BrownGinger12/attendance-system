from flask import Flask
from flask_cors import CORS
from handler.employee_handler import get_employee_by_id, get_employees_paginated, get_total_employee_pages
from handler.attendance_record_handler import get_attendance_month, get_attendance_day, get_attendance_employee

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# -------------------------
# Employee endpoints
# -------------------------
@app.route("/employees", methods=["GET"])
def employees():
    return get_employees_paginated()

@app.route("/employee/<int:user_id>", methods=["GET"])
def employee(user_id):
    return get_employee_by_id(user_id)

@app.route("/employees/pages", methods=["GET"])
def employees_total_pages():
    return get_total_employee_pages()

# -------------------------
# Attendance endpoints
# -------------------------
# Employee attendance (all / monthly / daily)
@app.route("/attendance/employee", methods=["GET"])
def attendance_employee():
    return get_attendance_employee()

# Attendance for all employees by month
@app.route("/attendance/month", methods=["GET"])
def attendance_month():
    return get_attendance_month()

# Attendance for all employees by day
@app.route("/attendance/day", methods=["GET"])
def attendance_day():
    return get_attendance_day()


if __name__ == "__main__":
    # Run on network: host="0.0.0.0" makes it accessible on local network
    # You can change port if needed
    app.run(debug=True, host="0.0.0.0", port=5000)
