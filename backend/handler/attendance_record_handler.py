from flask import request, jsonify
from model.attendance_records import AttendanceRecord

# Attendance for all employees by month
def get_attendance_month():
    month = request.args.get("month")  # format "YYYY-MM"
    if not month:
        return jsonify({"message": "Month parameter is required"}), 400

    result = AttendanceRecord.get_month(month)
    return jsonify(result), result["statusCode"]

# Attendance for all employees by day
def get_attendance_day():
    day = request.args.get("day")  # format "YYYY-MM-DD"
    if not day:
        return jsonify({"message": "Day parameter is required"}), 400

    result = AttendanceRecord.get_day(day)
    return jsonify(result), result["statusCode"]

# Attendance for specific employee (all / monthly / daily)
def get_attendance_employee():
    try:
        user_id = request.args.get("user_id", type=int)
        if not user_id:
            return jsonify({"message": "user_id parameter is required"}), 400

        month = request.args.get("month")  # optional
        day = request.args.get("day")      # optional

        result = AttendanceRecord.get_by_employee(user_id, month=month, day=day)
        return jsonify(result), result["statusCode"]

    except Exception as e:
        return jsonify({"message": str(e)}), 500

def add_attendance():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "JSON body is required"}), 400

        userid    = data.get("userid")
        checktime = data.get("checktime")

        if not userid or not checktime:
            return jsonify({"message": "userid and checktime are required"}), 400

        from datetime import datetime
        if isinstance(checktime, str):
            try:
                checktime = datetime.fromisoformat(checktime.replace("Z", "+00:00"))
                if checktime.tzinfo:
                    checktime = checktime.replace(tzinfo=None)
            except ValueError:
                return jsonify({"message": "Invalid checktime format. Use ISO 8601 (e.g. 2026-04-07T08:00:00)"}), 400

        result = AttendanceRecord.create(
            userid=userid,
            checktime=checktime,
            checktype=data.get("checktype"),
            verifycode=data.get("verifycode"),
            sensorid=data.get("sensorid"),
            sn=data.get("sn"),
        )
        return jsonify(result), result["statusCode"]

    except Exception as e:
        return jsonify({"message": str(e)}), 500

def edit_attendance(record_id):
    try:
        data = request.get_json()

        if not data:
            return jsonify({"message": "JSON body is required"}), 400

        result = AttendanceRecord.edit_by_id(record_id, data)
        return jsonify(result), result["statusCode"]

    except Exception as e:
        return jsonify({"message": str(e)}), 500
