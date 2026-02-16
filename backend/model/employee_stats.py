# model/employee_daily_stats.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, time, timedelta
from gateway.mysql_gateway import fetch_query


class EmployeeDailyStats(BaseModel):
    id: Optional[int] = None
    userid: int
    work_date: datetime
    am_time_in: Optional[time] = None
    am_time_out: Optional[time] = None
    am_work_seconds: Optional[int] = None
    pm_time_in: Optional[time] = None
    pm_time_out: Optional[time] = None
    pm_work_seconds: Optional[int] = None
    total_work_seconds: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # --------------------------
    # Helper: Convert timedelta to time string
    # --------------------------
    @staticmethod
    def _convert_timedelta_to_time_str(td):
        if td is None:
            return None
        if isinstance(td, timedelta):
            total_seconds = int(td.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return str(td)

    # --------------------------
    # Helper: Process rows to convert timedelta to strings
    # --------------------------
    @staticmethod
    def _process_rows(rows):
        if not rows:
            return rows
        
        processed = []
        for row in rows:
            row_dict = dict(row)
            # Convert TIME fields from timedelta to string
            for field in ['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']:
                if field in row_dict and row_dict[field] is not None:
                    row_dict[field] = EmployeeDailyStats._convert_timedelta_to_time_str(row_dict[field])
            processed.append(row_dict)
        return processed

    # --------------------------
    # Get daily stats for a specific month (YYYY-MM)
    # --------------------------
    @staticmethod
    def get_month(month: str, user_id: Optional[int] = None):
        try:
            start = datetime.strptime(month + "-01", "%Y-%m-%d")
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)

            params = [start, end]
            sql = """
            SELECT *
            FROM employee_daily_stats
            WHERE work_date >= %s AND work_date < %s
            """
            
            if user_id:
                sql += " AND userid = %s"
                params.append(user_id)
            
            sql += " ORDER BY work_date DESC, userid ASC"
            
            rows = fetch_query(sql, params)
            processed_rows = EmployeeDailyStats._process_rows(rows)
            
            return {"statusCode": 200, "count": len(processed_rows), "data": processed_rows} if processed_rows else {
                "statusCode": 404,
                "message": "No daily stats found for this month"
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get stats for a specific employee
    # --------------------------
    @staticmethod
    def get_by_employee(user_id: int, month: str):
        try:
            start = datetime.strptime(month + "-01", "%Y-%m-%d")
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)

            sql = """
            SELECT *
            FROM employee_daily_stats
            WHERE userid = %s AND work_date >= %s AND work_date < %s
            ORDER BY work_date DESC
            """
            rows = fetch_query(sql, [user_id, start, end])
            processed_rows = EmployeeDailyStats._process_rows(rows)
            
            return {"statusCode": 200, "count": len(processed_rows), "data": processed_rows} if processed_rows else {
                "statusCode": 404,
                "message": f"No daily stats found for USERID {user_id} in {month}"
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}