from pydantic import BaseModel
from typing import Optional
from gateway.mysql_gateway import fetch_query, query

class Department(BaseModel):
    deptid: int
    deptname: str
    supdeptid: Optional[int] = None
    inheritparentsch: Optional[int] = None
    inheritdeptsch: Optional[int] = None
    inheritdeptschclass: Optional[int] = None
    autoschplan: Optional[int] = None
    inlate: Optional[int] = None
    outearly: Optional[int] = None
    inheritdeptrule: Optional[int] = None
    minautoschinterval: Optional[int] = None
    registerot: Optional[int] = None
    defaultschid: Optional[int] = None
    att: Optional[int] = None
    holiday: Optional[int] = None
    overtime: Optional[int] = None

    # --------------------------
    # Get ALL departments
    # --------------------------
    @staticmethod
    def get_all():
        try:
            sql = "SELECT * FROM departments ORDER BY deptid"
            rows = fetch_query(sql)

            return {
                "statusCode": 200,
                "count": len(rows),
                "data": rows
            } if rows else {
                "statusCode": 404,
                "message": "No departments found"
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Create department
    # --------------------------
    @staticmethod
    def create(deptname: str, supdeptid: Optional[int] = None):
        try:
            if not deptname.strip():
                return {"statusCode": 400, "message": "Department name is required"}
            result = query(
                "INSERT INTO departments (deptname, supdeptid) VALUES (%s, %s)",
                [deptname.strip(), supdeptid],
            )
            if result["statusCode"] == 200:
                rows = fetch_query(
                    "SELECT * FROM departments WHERE deptname = %s ORDER BY deptid DESC LIMIT 1",
                    [deptname.strip()],
                )
                return {"statusCode": 200, "message": "Department created", "data": rows[0] if rows else None}
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Update department
    # --------------------------
    @staticmethod
    def update(dept_id: int, deptname: str):
        try:
            if not deptname.strip():
                return {"statusCode": 400, "message": "Department name is required"}
            rows = fetch_query("SELECT deptid FROM departments WHERE deptid = %s", [dept_id])
            if not rows:
                return {"statusCode": 404, "message": "Department not found"}
            result = query(
                "UPDATE departments SET deptname = %s WHERE deptid = %s",
                [deptname.strip(), dept_id],
            )
            if result["statusCode"] == 200:
                result["message"] = "Department updated"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Delete department
    # --------------------------
    @staticmethod
    def delete(dept_id: int):
        try:
            rows = fetch_query("SELECT deptid FROM departments WHERE deptid = %s", [dept_id])
            if not rows:
                return {"statusCode": 404, "message": "Department not found"}
            result = query("DELETE FROM departments WHERE deptid = %s", [dept_id])
            if result["statusCode"] == 200:
                result["message"] = "Department deleted"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get department by ID
    # --------------------------
    @staticmethod
    def get_by_id(dept_id: int):
        try:
            sql = "SELECT * FROM departments WHERE deptid = %s"
            rows = fetch_query(sql, [dept_id])

            return {
                "statusCode": 200,
                "data": rows[0]
            } if rows else {
                "statusCode": 404,
                "message": f"Department {dept_id} not found"
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
