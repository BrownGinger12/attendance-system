from pydantic import BaseModel
from typing import Optional, ClassVar
import base64
import math
import re
import os
from io import BytesIO
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import pandas as pd
from gateway.mysql_gateway import fetch_query, query  # updated for SQL

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 8


def _validate_password_strength(password: str) -> str | None:
    """Returns an error message if the password is weak, else None."""
    if len(password) < 8 or len(password) > 16:
        return "Password must be between 8 and 16 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
        return "Password must contain at least one symbol"
    return None

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
    role: Optional[str] = None  # new attribute
    schedule_type: Optional[str] = None  # new attribute

    # -------------------------
    # TOTAL EMPLOYEES
    # -------------------------
    # -------------------------
    # AUTH
    # -------------------------
    @staticmethod
    def login(badge_number: str, password: str):
        try:
            sql = """
                SELECT e.USERID, e.Badgenumber, e.Name, e.PASSWORD,
                       e.role, e.DEFAULTDEPTID, d.deptname
                FROM employees e
                LEFT JOIN departments d ON d.deptid = e.DEFAULTDEPTID
                WHERE e.Badgenumber = %s
            """
            rows = fetch_query(sql, [badge_number])

            if not rows:
                return {"statusCode": 401, "message": "Invalid Employee ID or password"}

            row = rows[0]
            stored_hash = row.get("PASSWORD")

            if not stored_hash:
                return {"statusCode": 401, "message": "No password set for this account"}

            if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
                return {"statusCode": 401, "message": "Invalid Employee ID or password"}

            department = row.get("deptname") or "Unknown"

            payload = {
                "sub": str(row["USERID"]),
                "badge": row["Badgenumber"],
                "name": row["Name"],
                "department": department,
                "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

            avatar_rows = fetch_query(
                "SELECT avatar_url FROM employee_avatars WHERE user_id = %s",
                [row["USERID"]]
            )
            avatar_url = avatar_rows[0]["avatar_url"] if avatar_rows else None

            return {
                "statusCode": 200,
                "token": token,
                "employee": {
                    "id": row["USERID"],
                    "badge": row["Badgenumber"],
                    "name": row["Name"],
                    "department": department,
                    "avatar_url": avatar_url,
                    "role": row.get("role"),
                    "dept_id": row.get("DEFAULTDEPTID"),
                },
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def change_password(badge_number: str, old_password: str, new_password: str):
        try:
            # Validate new password strength
            error = _validate_password_strength(new_password)
            if error:
                return {"statusCode": 400, "message": error}

            sql = "SELECT USERID, PASSWORD FROM employees WHERE Badgenumber = %s"
            rows = fetch_query(sql, [badge_number])

            if not rows:
                return {"statusCode": 404, "message": "Employee not found"}

            row = rows[0]
            stored_hash = row.get("PASSWORD")

            if not stored_hash or not bcrypt.checkpw(old_password.encode(), stored_hash.encode()):
                return {"statusCode": 401, "message": "Current password is incorrect"}

            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            result = query(
                "UPDATE employees SET PASSWORD = %s WHERE USERID = %s",
                [new_hash, row["USERID"]],
            )
            if result["statusCode"] == 200:
                result["message"] = "Password changed successfully"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # CHECKIN / CHECKOUT
    # -------------------------
    @staticmethod
    def checkin(user_id: int):
        try:
            from model.attendance_records import AttendanceRecord
            return AttendanceRecord.create(
                userid=user_id,
                checktime=datetime.now(),
                checktype="I",
            )
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def checkout(user_id: int):
        try:
            from model.attendance_records import AttendanceRecord
            return AttendanceRecord.create(
                userid=user_id,
                checktime=datetime.now(),
                checktype="O",
            )
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

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

    _UPDATABLE_COLUMNS: ClassVar[set] = {
        "Name", "defaultdeptid", "badgenumber", "SSN", "Gender", "TITLE", "PAGER", "BIRTHDAY",
        "HIREDDAY", "street", "CITY", "STATE", "ZIP", "OPHONE", "FPHONE",
        "VERIFICATIONMETHOD", "SECURITYFLAGS", "ATT", "INLATE", "OUTEARLY",
        "OVERTIME", "SEP", "HOLIDAY", "MINZU", "PASSWORD", "LUNCHDURATION",
        "PHOTO", "mverifypass", "Notes", "privilege", "role", "InheritDeptSch",
        "InheritDeptSchClass", "AutoSchPlan", "MinAutoSchInterval", "RegisterOT",
        "InheritDeptRule", "EMPRIVILEGE", "CardNo", "FaceGroup", "AccGroup",
        "UseAccGroupTZ", "VerifyCode", "Expires", "ValidCount", "ValidTimeBegin",
        "ValidTimeEnd", "TimeZone1", "TimeZone2", "TimeZone3", "Pin1", "schedule_type",
    }

    @staticmethod
    def update(user_id: int, data: dict):
        try:
            existing = Employee.get_by_id(user_id)
            if existing["statusCode"] != 200:
                return existing

            if not data:
                return {"statusCode": 400, "message": "No update data provided"}

            fields = []
            values = []

            for k, v in data.items():
                if k not in Employee._UPDATABLE_COLUMNS:
                    return {"statusCode": 400, "message": f"Invalid or non-updatable field: {k}"}
                fields.append(f"`{k}` = %s")
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
    def get_avatar(user_id: int):
        rows = fetch_query("SELECT avatar_url FROM employee_avatars WHERE user_id = %s", [user_id])
        return rows[0]["avatar_url"] if rows else None

    @staticmethod
    def upsert_avatar(user_id: int, avatar_url: str):
        return query(
            """INSERT INTO employee_avatars (user_id, avatar_url) VALUES (%s, %s)
               ON DUPLICATE KEY UPDATE avatar_url = %s, updated_at = NOW()""",
            [user_id, avatar_url, avatar_url],
        )

    @staticmethod
    def update_name(user_id: int, name: str):
        name = name.strip()
        if not name:
            return {"statusCode": 400, "message": "Name cannot be empty"}
        result = query("UPDATE employees SET Name = %s WHERE USERID = %s", [name, user_id])
        if result["statusCode"] == 200:
            result["message"] = "Name updated successfully"
        return result

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

    @staticmethod
    def get_by_department(dept_id: int):
        try:
            sql = """
            SELECT *
            FROM employees
            WHERE DEFAULTDEPTID = %s
            ORDER BY USERID
            """
            rows = fetch_query(sql, [dept_id])

            if not rows:
                return {
                    "statusCode": 404,
                    "message": "No employees found for this department"
                }

            # Convert bytes (e.g., PHOTO) to base64
            for row in rows:
                for k, v in row.items():
                    if isinstance(v, bytes):
                        row[k] = base64.b64encode(v).decode("utf-8")

            return {
                "statusCode": 200,
                "department_id": dept_id,
                "count": len(rows),
                "data": rows
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
