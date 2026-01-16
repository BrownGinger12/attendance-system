from pydantic import BaseModel
from typing import Optional
import base64 
import math
from gateway.microsoft_db_gateway import fetch_query

class Employee(BaseModel):
    USERID: int
    Badgenumber: str
    Name: str
    DEFAULTDEPTID: Optional[int] = None
    SSN: Optional[str] = None
    Gender: Optional[str] = None
    TITLE: Optional[str] = None
    PAGER: Optional[str] = None
    BIRTHDAY: Optional[str] = None
    HIREDDAY: Optional[str] = None
    street: Optional[str] = None
    CITY: Optional[str] = None
    STATE: Optional[str] = None
    ZIP: Optional[str] = None
    OPHONE: Optional[str] = None
    FPHONE: Optional[str] = None
    VERIFICATIONMETHOD: Optional[int] = None
    SECURITYFLAGS: Optional[int] = None
    ATT: Optional[int] = None
    INLATE: Optional[int] = None
    OUTEARLY: Optional[int] = None
    OVERTIME: Optional[int] = None
    SEP: Optional[int] = None
    HOLIDAY: Optional[int] = None
    MINZU: Optional[str] = None
    PASSWORD: Optional[str] = None
    LUNCHDURATION: Optional[int] = None
    PHOTO: Optional[bytes] = None
    mverifypass: Optional[str] = None
    Notes: Optional[str] = None
    privilege: Optional[int] = None
    InheritDeptSch: Optional[int] = None
    InheritDeptSchClass: Optional[int] = None
    AutoSchPlan: Optional[int] = None
    MinAutoSchInterval: Optional[int] = None
    RegisterOT: Optional[int] = None
    InheritDeptRule: Optional[int] = None
    EMPRIVILEGE: Optional[int] = None
    CardNo: Optional[str] = None
    FaceGroup: Optional[int] = None
    AccGroup: Optional[int] = None
    UseAccGroupTZ: Optional[int] = None
    VerifyCode: Optional[int] = None
    Expires: Optional[int] = None
    ValidCount: Optional[int] = None
    ValidTimeBegin: Optional[str] = None
    ValidTimeEnd: Optional[str] = None
    TimeZone1: Optional[int] = None
    TimeZone2: Optional[int] = None
    TimeZone3: Optional[int] = None
    Pin1: Optional[str] = None

    # -------------------------
    # TOTAL EMPLOYEES
    # -------------------------
    @staticmethod
    def get_total():
        sql = "SELECT COUNT(*) AS total FROM [USERINFO]"
        result = fetch_query(sql)
        return result[0]["total"] if result else 0
    
    

    @staticmethod
    def get_paginated(page: int = 1, limit: int = 10):
        try:
            page = max(page, 1)
            limit = min(max(limit, 1), 100)  # safety cap

            total_employees = Employee.get_total()
            total_pages = math.ceil(total_employees / limit)
            offset = (page - 1) * limit

            # ---------------------
            # Page 1 -> simple TOP query
            # ---------------------
            if offset == 0:
                sql = f"""
                SELECT TOP {limit} *
                FROM [USERINFO]
                ORDER BY [USERID]
                """
            else:
                sql = f"""
                SELECT TOP {limit} *
                FROM [USERINFO]
                WHERE [USERID] NOT IN (
                    SELECT TOP {offset} [USERID]
                    FROM [USERINFO]
                    ORDER BY [USERID]
                )
                ORDER BY [USERID]
                """ 

            rows = fetch_query(sql)

            # ---------------------
            # Convert bytes (PHOTO) to Base64 for JSON
            # ---------------------
            for row in rows:
                for k, v in row.items():
                    if isinstance(v, bytes):
                        row[k] = base64.b64encode(v).decode("utf-8")

            return {
                "statusCode": 200,
                "page": page,
                "limit": limit,
                "total_employees": total_employees,
                "total_pages": total_pages,
                "count": len(rows),
                "data": rows
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
        
    @staticmethod
    def get_by_id(user_id: int):
        try:
            sql = f"SELECT * FROM [USERINFO] WHERE USERID = {user_id}"
            rows = fetch_query(sql)

            if not rows:
                return {"statusCode": 404, "message": f"Employee with USERID {user_id} not found"}

            # Convert PHOTO to Base64
            for row in rows:
                for k, v in row.items():
                    if isinstance(v, bytes):
                        row[k] = base64.b64encode(v).decode("utf-8")

            return {"statusCode": 200, "data": rows[0]}  # single employee

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}