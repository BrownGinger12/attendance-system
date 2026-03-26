from flask import request, jsonify
from model.sub_department import SubDepartment


def get_my_sub_department(current_employee):
    try:
        owner_id = int(current_employee["userid"])
        result = SubDepartment.get_by_owner(owner_id)
        if result["statusCode"] == 404:
            return jsonify({"statusCode": 404, "data": None}), 200  # 200 so frontend can check data=null
        if result["statusCode"] != 200:
            return jsonify(result), result["statusCode"]

        sub_dept = result["data"]
        members = SubDepartment.get_members(sub_dept["id"])
        sub_dept["members"] = members.get("data", [])
        return jsonify({"statusCode": 200, "data": sub_dept}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def create_sub_department(current_employee):
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "name is required"}), 400

        owner_id = int(current_employee["userid"])
        parent_dept_id = int(current_employee.get("DEFAULTDEPTID") or current_employee.get("defaultdeptid") or 0)

        # Only one sub-dept per employee
        existing = SubDepartment.get_by_owner(owner_id)
        if existing["statusCode"] == 200:
            return jsonify({"message": "You already have a sub-department"}), 409

        result = SubDepartment.create(name, owner_id, parent_dept_id)
        if result["statusCode"] not in (200, 201):
            return jsonify(result), result["statusCode"]
        return jsonify({"statusCode": 201, "id": result["id"]}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def rename_sub_department(current_employee, sub_dept_id: int):
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "name is required"}), 400
        owner_id = int(current_employee["userid"])
        result = SubDepartment.rename(sub_dept_id, owner_id, name)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def add_member(current_employee, sub_dept_id: int):
    try:
        data = request.get_json(silent=True) or {}
        employee_id = data.get("employee_id")
        if not employee_id:
            return jsonify({"message": "employee_id is required"}), 400
        result = SubDepartment.add_member(sub_dept_id, int(employee_id))
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def remove_member(current_employee, sub_dept_id: int, employee_id: int):
    try:
        result = SubDepartment.remove_member(sub_dept_id, employee_id)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def search_candidates(current_employee, sub_dept_id: int):
    try:
        term = request.args.get("q", "").strip()
        owner_id = int(current_employee["userid"])

        sub = SubDepartment.get_by_owner(owner_id)
        if sub["statusCode"] != 200:
            return jsonify({"statusCode": 404, "data": []}), 200

        # parent_dept_id is the supdeptid of the sub-dept
        parent_dept_id = sub["data"].get("parent_dept_id") or 0
        result = SubDepartment.search_candidates(sub_dept_id, parent_dept_id, term)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500


def get_membership(current_employee):
    try:
        user_id = int(current_employee["userid"])
        result = SubDepartment.get_membership(user_id)
        return jsonify(result), result.get("statusCode", 200)
    except Exception as e:
        return jsonify({"message": str(e)}), 500
