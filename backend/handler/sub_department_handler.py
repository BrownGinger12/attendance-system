from flask import request, jsonify
from model.sub_department import SubDepartment


def get_my_sub_department(current_employee):
    try:
        from gateway.mysql_gateway import fetch_query as fq
        owner_id    = int(current_employee["userid"])
        dept_id     = int(current_employee.get("DEFAULTDEPTID") or current_employee.get("defaultdeptid") or 0)

        result = SubDepartment.get_by_owner(owner_id)

        if result["statusCode"] == 200:
            # Has a sub-dept in department_managers — use it with sub_department_members
            sub_dept = result["data"]
            members  = SubDepartment.get_members(sub_dept["id"])
            sub_dept["members"] = members.get("data", [])
        elif dept_id:
            # No sub-dept entry — fall back to the employee's department directly
            dept_rows = fq("SELECT deptid AS id, deptname AS name FROM departments WHERE deptid = %s", [dept_id])
            if not dept_rows:
                return jsonify({"statusCode": 404, "data": None}), 200
            sub_dept = {**dept_rows[0], "parent_dept_id": None, "parent_dept_name": None}
            member_rows = fq(
                """
                SELECT e.userid, e.Name AS name, e.Badgenumber AS badge,
                       e.role, ea.avatar_url
                FROM   employees e
                LEFT JOIN employee_avatars ea ON ea.user_id = e.userid
                WHERE  e.DEFAULTDEPTID = %s
                ORDER BY e.Name
                """,
                [dept_id],
            )
            sub_dept["members"] = member_rows or []
        else:
            return jsonify({"statusCode": 404, "data": None}), 200

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
        from gateway.mysql_gateway import fetch_query as fq
        from datetime import date
        user_id = int(current_employee["userid"])
        dept_id = int(current_employee.get("DEFAULTDEPTID") or current_employee.get("defaultdeptid") or 0)

        result = SubDepartment.get_membership(user_id)

        if result["statusCode"] == 200:
            return jsonify(result), 200

        # No sub-dept found — fall back to all employees in the same department
        if not dept_id:
            return jsonify({"statusCode": 404, "data": None}), 200

        dept_rows = fq("SELECT deptid AS id, deptname AS name FROM departments WHERE deptid = %s", [dept_id])
        if not dept_rows:
            return jsonify({"statusCode": 404, "data": None}), 200

        members = fq(
            """
            SELECT e.userid, e.Name AS name, e.Badgenumber AS badge,
                   e.role, ea.avatar_url
            FROM   employees e
            LEFT JOIN employee_avatars ea ON ea.user_id = e.userid
            WHERE  e.DEFAULTDEPTID = %s
            ORDER BY e.Name
            """,
            [dept_id],
        ) or []

        # Today's online status
        if members:
            ids = [m["userid"] for m in members]
            placeholders = ",".join(["%s"] * len(ids))
            att = fq(
                f"""
                SELECT a.userid, a.checktype
                FROM   attendance a
                INNER JOIN (
                    SELECT userid, MAX(checktime) AS latest
                    FROM   attendance
                    WHERE  DATE(checktime) = CURDATE() AND userid IN ({placeholders})
                    GROUP BY userid
                ) la ON a.userid = la.userid AND a.checktime = la.latest
                """,
                ids,
            )
            status_map = {r["userid"]: r["checktype"] for r in (att or [])}
            for m in members:
                m["is_online"] = status_map.get(m["userid"]) == "I"

        sub_dept = {**dept_rows[0], "members": members}
        return jsonify({"statusCode": 200, "data": sub_dept}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
