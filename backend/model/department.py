from pydantic import BaseModel
from typing import Optional
from gateway.microsoft_db_gateway import fetch_query


class Department(BaseModel):
    DEPTID: int
    DEPTNAME: str
    SUPDEPTID: Optional[int] = None
    InheritParentSch: Optional[int] = None
    InheritDeptSch: Optional[int] = None
    InheritDeptSchClass: Optional[int] = None
    AutoSchPlan: Optional[int] = None
    InLate: Optional[int] = None
    OutEarly: Optional[int] = None
    InheritDeptRule: Optional[int] = None
    MinAutoSchInterval: Optional[int] = None
    RegisterOT: Optional[int] = None
    DefaultSchId: Optional[int] = None
    ATT: Optional[int] = None
    Holiday: Optional[int] = None
    OverTime: Optional[int] = None

    # --------------------------
    # Get ALL departments
    # --------------------------
    @staticmethod
    def get_all():
        try:
            sql = """
            SELECT *
            FROM [DEPARTMENTS]
            ORDER BY DEPTID
            """
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
            sql = f"""
            SELECT *
            FROM [DEPARTMENTS]
            WHERE DEPTID = {dept_id}
            """
            rows = fetch_query(sql)

            return {
                "statusCode": 200,
                "data": rows[0]
            } if rows else {
                "statusCode": 404,
                "message": f"Department {dept_id} not found"
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
