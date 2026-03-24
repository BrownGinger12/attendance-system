from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from gateway.mysql_gateway import fetch_query, query
from email.utils import parsedate_to_datetime


class AttendanceRecord(BaseModel):
    id: Optional[int] = None
    userid: int
    checktime: datetime
    checktype: Optional[str] = None
    verifycode: Optional[int] = None
    sensorid: Optional[str] = None
    sn: Optional[str] = None

    # --------------------------
    # Get attendance for a specific month (YYYY-MM)
    # --------------------------
    @staticmethod
    def get_month(month: str):
        try:
            start = datetime.strptime(month + "-01", "%Y-%m-%d")
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)

            sql = """
            SELECT *
            FROM attendance
            WHERE checktime >= %s AND checktime < %s
            ORDER BY checktime DESC
            """
            rows = fetch_query(sql, [start, end])
            return {"statusCode": 200, "count": len(rows), "data": rows} if rows else {
                "statusCode": 404,
                "message": "No attendance found for this month"
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get attendance for a specific day (YYYY-MM-DD)
    # --------------------------
    @staticmethod
    def get_day(date_str: str):
        try:
            day = datetime.strptime(date_str, "%Y-%m-%d")
            next_day = day.replace(day=day.day + 1)

            sql = """
            SELECT *
            FROM attendance
            WHERE checktime >= %s AND checktime < %s
            ORDER BY checktime DESC
            """
            rows = fetch_query(sql, [day, next_day])
            return {"statusCode": 200, "count": len(rows), "data": rows} if rows else {
                "statusCode": 404,
                "message": f"No attendance found for {date_str}"
            }   
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get attendance of a specific employee
    # --------------------------
    @staticmethod
    def get_by_employee(user_id: int, month: Optional[str] = None, day: Optional[str] = None):
        try:
            params = [user_id]
            sql = "SELECT * FROM attendance WHERE userid = %s"

            if month:
                start = datetime.strptime(month + "-01", "%Y-%m-%d")
                end = start.replace(month=start.month % 12 + 1, year=start.year + (start.month // 12))
                sql += " AND checktime >= %s AND checktime < %s"
                params.extend([start, end])

            elif day:
                day_dt = datetime.strptime(day, "%Y-%m-%d")
                next_day = day_dt.replace(day=day_dt.day + 1)
                sql += " AND checktime >= %s AND checktime < %s"
                params.extend([day_dt, next_day])

            sql += " ORDER BY checktime DESC"
            rows = fetch_query(sql, params)

            return {"statusCode": 200, "count": len(rows), "data": rows} if rows else {
                "statusCode": 404,
                "message": f"No attendance found for USERID {user_id}"
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # REALTIME polling (Watcher-safe)
    # --------------------------
    @staticmethod
    def get_after(after_time: datetime):
        try:
            sql = "SELECT * FROM attendance WHERE checktime > %s ORDER BY checktime ASC"
            return fetch_query(sql, [after_time]) or []
        except Exception as e:
            print("Attendance watcher error:", e)
            return []
    
        # --------------------------
    # Edit attendance record by ID
    # --------------------------

    @staticmethod
    def edit_by_id(record_id: int, data: dict):
        try:
            if not data:
                return {
                    "statusCode": 400,
                    "message": "No fields provided for update"
                }

            allowed_fields = [
                "userid",
                "checktime",
                "checktype",
                "verifycode",
                "sensorid",
                "sn"
            ]

            update_fields = []
            params = []

            for key, value in data.items():
                if key not in allowed_fields:
                    continue

                # ✅ Force checktime to datetime
                if key == "checktime":
                    if isinstance(value, str):
                        try:
                            # Try ISO format first
                            try:
                                value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                            except ValueError:
                                # Try GMT format (Fri, 13 Feb 2026 08:07:21 GMT)
                                value = parsedate_to_datetime(value)

                            # Remove timezone (MySQL DATETIME usually naive)
                            if value.tzinfo:
                                value = value.replace(tzinfo=None)

                        except Exception:
                            return {
                                "statusCode": 400,
                                "message": "Invalid datetime format for checktime"
                            }

                    elif not isinstance(value, datetime):
                        return {
                            "statusCode": 400,
                            "message": "checktime must be a datetime or valid datetime string"
                        }

                update_fields.append(f"{key} = %s")
                params.append(value)

            if not update_fields:
                return {
                    "statusCode": 400,
                    "message": "No valid fields to update"
                }

            sql = f"""
                UPDATE attendance
                SET {', '.join(update_fields)}
                WHERE id = %s
            """

            params.append(record_id)

            from gateway.mysql_gateway import query
            query(sql, params)

            return {
                "statusCode": 200,
                "message": f"Attendance record {record_id} updated successfully"
            }

        except Exception as e:
            return {
                "statusCode": 500,
                "message": str(e)
            }

    # --------------------------
    # Create attendance record
    # --------------------------
    @staticmethod
    def create(userid: int, checktime: datetime, checktype: Optional[str] = None,
               verifycode: Optional[int] = None, sensorid: Optional[str] = None,
               sn: Optional[str] = None):
        try:
            sql = """
                INSERT INTO attendance (userid, checktime, checktype, verifycode, sensorid, sn)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            result = query(sql, [userid, checktime, checktype, verifycode, sensorid, sn])
            if result["statusCode"] == 200:
                result["message"] = "Attendance record created successfully"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}