from flask import request, jsonify,send_file
from model.employee import Employee
from pydantic import ValidationError

def get_employees_paginated():
    try:
        page = request.args.get("page", default=1, type=int)
        limit = request.args.get("limit", default=10, type=int)

        response = Employee.get_paginated(page=page, limit=limit)

        if response["statusCode"] != 200:
            return jsonify({"message": response.get("message", "Error fetching employees")}), response["statusCode"]

        return jsonify(response), 200

    except ValidationError as e:
        return jsonify({"message": str(e)}), 400

    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
def get_employee_by_id(user_id: int):
    try:
        result = Employee.get_by_id(user_id)
        return jsonify(result), result["statusCode"]

    except ValidationError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
def get_total_employee_pages():
    try:
        limit = request.args.get("limit", default=10, type=int)
        limit = max(limit, 1)  # safety

        total_employees = Employee.get_total()
        total_pages = (total_employees + limit - 1) // limit  # ceil division

        return jsonify({
            "statusCode": 200,
            "total_employees": total_employees,
            "limit": limit,
            "total_pages": total_pages
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
def update_employee(user_id):
    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"message": "No data provided"}), 400

        response = Employee.update(user_id, data)

        return jsonify(response), response["statusCode"]

    except Exception as e:
        return jsonify({"message": str(e)}), 500

def get_employee_count():
    try:
        total_employees = Employee.get_total()

        return jsonify({
            "statusCode": 200,
            "total_employees": total_employees
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

def delete_employee(user_id: int):
    try:
        result = Employee.delete(user_id)
        return jsonify(result), result["statusCode"]

    except ValidationError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500

def search_employees():
    try:
        query = request.args.get("query", default="", type=str)
        page = request.args.get("page", default=1, type=int)
        limit = request.args.get("limit", default=10, type=int)
        
        if not query or query.strip() == "":
            return jsonify({"message": "Query parameter is required"}), 400
        
        response = Employee.search(query.strip(), page=page, limit=limit)
        
        if response["statusCode"] != 200:
            return jsonify({"message": response.get("message", "Error searching employees")}), response["statusCode"]
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500

def get_user_fingerprints(user_id: int):
    try:
        result = Employee.get_fingerprints_by_user(user_id)
        return jsonify(result), result["statusCode"]
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
def export_employees_excel():
    try:
        excel_file = Employee.export_all_to_excel()
        
        if not excel_file:
            return jsonify({"message": "Failed to generate Excel file"}), 500
        
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='employees.xlsx'
        )
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500