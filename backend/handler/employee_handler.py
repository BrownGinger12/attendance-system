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
    
def get_employee_by_badge():
    """
    Fetch an employee by their badge number (Badgenumber)
    Expects a query parameter: ?badge=<badge_number>
    """
    try:
        badge_number = request.args.get("badge", default="", type=str).strip()

        if not badge_number:
            return jsonify({"message": "Badge number is required"}), 400

        result = Employee.get_by_badge(badge_number)
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
    
def export_employees_to_excel():
    """
    Export all employees to Excel file
    """
    try:
        from datetime import datetime
        
        excel_buffer = Employee.export_to_excel()
        
        if not excel_buffer:
            return jsonify({'error': 'Failed to generate Excel file or no employees found'}), 404
        
        # Generate filename with current date
        current_date = datetime.now().strftime('%Y-%m-%d')
        output_filename = f"employees_{current_date}.xlsx"
        
        return send_file(
            excel_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=output_filename
        )
        
    except Exception as e:
        print(f"Export handler error: {e}")
        return jsonify({'error': str(e)}), 500
    
def get_employees_by_department(dept_id: int):
    try:
        result = Employee.get_by_department(dept_id)
        return jsonify(result), result["statusCode"]

    except ValidationError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500
