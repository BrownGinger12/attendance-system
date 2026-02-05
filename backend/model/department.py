from pydantic import BaseModel
from typing import Optional
from gateway.mysql_gateway import fetch_query

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
