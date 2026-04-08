from flask import jsonify, request
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


# --------------------------
# Create department
# POST /department
# --------------------------
def create_department():
    try:
        data = request.get_json(silent=True) or {}
        deptname = data.get("deptname", "").strip()
        supdeptid = data.get("supdeptid", None)
        if not deptname:
            return jsonify({"message": "deptname is required"}), 400
        response = Department.create(deptname, supdeptid)
        return jsonify(response), response["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# --------------------------
# Update department
# PUT /department/<id>
# --------------------------
def update_department(dept_id: int):
    try:
        data = request.get_json(silent=True) or {}
        deptname = data.get("deptname", "").strip()
        if not deptname:
            return jsonify({"message": "deptname is required"}), 400
        response = Department.update(dept_id, deptname)
        return jsonify(response), response["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# --------------------------
# Delete department
# DELETE /department/<id>
# --------------------------
def delete_department(dept_id: int):
    try:
        response = Department.delete(dept_id)
        return jsonify(response), response["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500
