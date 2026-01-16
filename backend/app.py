from flask import Flask
from handler.employee_handler import get_employees_paginated

app = Flask(__name__)

@app.route("/employees", methods=["GET"])
def employees():
    return get_employees_paginated()


if __name__ == "__main__":
    app.run(debug=True)
