from pydantic import BaseModel
from typing import Optional
import base64
import math
from io import BytesIO
import pandas as pd
from gateway.mysql_gateway import fetch_query, query  # updated for SQL

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
    schedule_type: Optional[str] = None  # new attribute

    # -------------------------
    # TOTAL EMPLOYEES
    # -------------------------
    @staticmethod
    def get_total():
        sql = "SELECT COUNT(*) AS total FROM employees"
        result = fetch_query(sql)
        return result[0]["total"] if result else 0

    @staticmethod
    def get_paginated(page: int = 1, limit: int = 10):
        try:
            page = max(page, 1)
            limit = min(max(limit, 1), 100)

            total_employees = Employee.get_total()
            total_pages = math.ceil(total_employees / limit)
            offset = (page - 1) * limit

            sql = f"""
            SELECT * 
            FROM employees
            ORDER BY USERID
            LIMIT %s OFFSET %s
            """
            rows = fetch_query(sql, [limit, offset])

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
            sql = "SELECT * FROM employees WHERE USERID = %s"
            rows = fetch_query(sql, [user_id])

            if not rows:
                return {"statusCode": 404, "message": "Employee not found"}

            row = rows[0]
            photo = row.get("PHOTO")
            if photo:
                if isinstance(photo, str):
                    row["PHOTO"] = photo.strip()
                elif isinstance(photo, bytes):
                    try:
                        row["PHOTO"] = photo.decode("utf-16-le").strip()
                    except UnicodeDecodeError:
                        row["PHOTO"] = base64.b64encode(photo).decode("utf-8")

            return {"statusCode": 200, "data": row}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
    
    @staticmethod
    def get_by_badge(badge_number: str):
        try:
            sql = "SELECT * FROM employees WHERE Badgenumber = %s"
            rows = fetch_query(sql, [badge_number])

            if not rows:
                return {"statusCode": 404, "message": "Employee not found"}

            row = rows[0]
            photo = row.get("PHOTO")
            if photo:
                if isinstance(photo, str):
                    row["PHOTO"] = photo.strip()
                elif isinstance(photo, bytes):
                    try:
                        row["PHOTO"] = photo.decode("utf-16-le").strip()
                    except UnicodeDecodeError:
                        row["PHOTO"] = base64.b64encode(photo).decode("utf-8")

            return {"statusCode": 200, "data": row}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def update(user_id: int, data: dict):
        try:
            existing = Employee.get_by_id(user_id)
            if existing["statusCode"] != 200:
                return existing

            if not data:
                return {"statusCode": 400, "message": "No update data provided"}

            blocked = {"USERID", "Badgenumber"}
            fields = []
            values = []

            for k, v in data.items():
                if k in blocked:
                    continue
                fields.append(f"{k} = %s")
                values.append(v)

            values.append(user_id)
            sql = f"UPDATE employees SET {', '.join(fields)} WHERE USERID = %s"
            return query(sql, values)
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def delete(user_id: int):
        try:
            existing = Employee.get_by_id(user_id)
            if existing["statusCode"] != 200:
                return existing

            sql = "DELETE FROM employees WHERE USERID = %s"
            return query(sql, [user_id])
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def search(term: str, page: int = 1, limit: int = 10):
        try:
            page = max(page, 1)
            limit = min(max(limit, 1), 100)
            search_pattern = f"%{term}%"

            total_sql = "SELECT COUNT(*) AS total FROM employees WHERE Name LIKE %s OR Badgenumber LIKE %s"
            total_result = fetch_query(total_sql, [search_pattern, search_pattern])
            total_employees = total_result[0]["total"] if total_result else 0
            total_pages = math.ceil(total_employees / limit)
            offset = (page - 1) * limit

            sql = f"""
            SELECT * FROM employees
            WHERE Name LIKE %s OR Badgenumber LIKE %s
            ORDER BY USERID
            LIMIT %s OFFSET %s
            """
            rows = fetch_query(sql, [search_pattern, search_pattern, limit, offset])

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
