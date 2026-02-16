# handlers/employee_stats_handler.py
from flask import request, jsonify
from model.employee_stats import EmployeeDailyStats

# Daily stats for all employees (or specific employee) by month
def get_stats_month():
    month = request.args.get("month")  # format "YYYY-MM"
    if not month:
        return jsonify({"message": "Month parameter is required"}), 400

    user_id = request.args.get("user_id", type=int)  # optional

    result = EmployeeDailyStats.get_month(month, user_id=user_id)
    return jsonify(result), result["statusCode"]

# Daily stats for specific employee by month
def get_stats_employee():
    try:
        user_id = request.args.get("user_id", type=int)
        month = request.args.get("month")  # format "YYYY-MM"

        if not user_id:
            return jsonify({"message": "user_id parameter is required"}), 400
        
        if not month:
            return jsonify({"message": "month parameter is required"}), 400

        result = EmployeeDailyStats.get_by_employee(user_id, month)
        return jsonify(result), result["statusCode"]

    except Exception as e:
        return jsonify({"message": str(e)}), 500