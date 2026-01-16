from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from gateway.microsoft_db_gateway import fetch_query

class AttendanceRecord(BaseModel):
    USERID: int
    CHECKTIME: datetime
    CHECKTYPE: str
    VERIFYCODE: Optional[int] = None
    SENSORID: Optional[str] = None
    Memoinfo: Optional[str] = None
    WorkCode: Optional[str] = None
    sn: Optional[str] = None
    UserExtFmt: Optional[int] = None

    # --------------------------
    # Get attendance for a specific month (all employees)
    # month in "YYYY-MM" format
    # --------------------------
    @staticmethod
    def get_month(month: str):
        try:
            sql = f"""
            SELECT *
            FROM [CHECKINOUT]
            WHERE FORMAT(CHECKTIME, 'yyyy-MM') = '{month}'
            ORDER BY CHECKTIME DESC
            """
            rows = fetch_query(sql)
            return {"statusCode": 200, "count": len(rows), "data": rows} if rows else {"statusCode": 404, "message": "No attendance found for this month"}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get attendance for a specific day (all employees)
    # date_str in "YYYY-MM-DD" format
    # --------------------------
    @staticmethod
    def get_day(date_str: str):
        try:
            sql = f"""
            SELECT *
            FROM [CHECKINOUT]
            WHERE FORMAT(CHECKTIME, 'yyyy-MM-dd') = '{date_str}'
            ORDER BY CHECKTIME DESC
            """
            rows = fetch_query(sql)
            return {"statusCode": 200, "count": len(rows), "data": rows} if rows else {"statusCode": 404, "message": f"No attendance found for {date_str}"}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get attendance of a specific employee
    # Optional month or day filter
    # --------------------------
    @staticmethod
    def get_by_employee(user_id: int, month: Optional[str] = None, day: Optional[str] = None):
        try:
            if month:
                sql = f"""
                SELECT *
                FROM [CHECKINOUT]
                WHERE USERID = {user_id} AND FORMAT(CHECKTIME, 'yyyy-MM') = '{month}'
                ORDER BY CHECKTIME DESC
                """
            elif day:
                sql = f"""
                SELECT *
                FROM [CHECKINOUT]
                WHERE USERID = {user_id} AND FORMAT(CHECKTIME, 'yyyy-MM-dd') = '{day}'
                ORDER BY CHECKTIME DESC
                """
            else:
                sql = f"""
                SELECT *
                FROM [CHECKINOUT]
                WHERE USERID = {user_id}
                ORDER BY CHECKTIME DESC
                """
            rows = fetch_query(sql)
            return {"statusCode": 200, "count": len(rows), "data": rows} if rows else {"statusCode": 404, "message": f"No attendance found for USERID {user_id}"}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
