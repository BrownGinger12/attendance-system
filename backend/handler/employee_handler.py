from flask import request, jsonify
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
