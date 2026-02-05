from flask import jsonify
from model.department import Department


# --------------------------
# Get all departments
# GET /departments
# --------------------------
def get_departments():
    try:
        response = Department.get_all()

        if response["statusCode"] != 200:
            return jsonify({"message": response.get("message")}), response["statusCode"]

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# --------------------------
# Get department by ID
# GET /department/<id>
# --------------------------
def get_department_by_id(dept_id: int):
    try:
        response = Department.get_by_id(dept_id)

        if response["statusCode"] != 200:
            return jsonify({"message": response.get("message")}), response["statusCode"]

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
