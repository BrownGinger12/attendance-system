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

    # --------------------------
    # Get all employee stats grouped by employee for a SPECIFIC MONTH
    # Includes employee name and department
    # --------------------------
    # model/employee_daily_stats.py
    @staticmethod
    def get_all_employees_summary(month: str):
        try:
            start = datetime.strptime(month + "-01", "%Y-%m-%d")
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)

            sql = """
            SELECT 
                e.USERID,
                e.Name as employee_name,
                e.Badgenumber as badge_number,
                d.deptid as department_id,
                d.deptname as department_name,
                COUNT(eds.id) as total_days_worked,
                
                -- Average times
                SEC_TO_TIME(AVG(TIME_TO_SEC(eds.am_time_in))) as avg_am_time_in,
                SEC_TO_TIME(AVG(TIME_TO_SEC(eds.am_time_out))) as avg_am_time_out,
                SEC_TO_TIME(AVG(TIME_TO_SEC(eds.pm_time_in))) as avg_pm_time_in,
                SEC_TO_TIME(AVG(TIME_TO_SEC(eds.pm_time_out))) as avg_pm_time_out,
                
                -- Total seconds
                SUM(eds.am_work_seconds) as total_am_seconds,
                SUM(eds.pm_work_seconds) as total_pm_seconds,
                SUM(eds.total_work_seconds) as total_work_seconds,
                
                -- Average seconds per day
                ROUND(AVG(eds.am_work_seconds), 0) as avg_am_seconds_per_day,
                ROUND(AVG(eds.pm_work_seconds), 0) as avg_pm_seconds_per_day,
                ROUND(AVG(eds.total_work_seconds), 0) as avg_work_seconds_per_day,
                
                -- Hours
                ROUND(SUM(eds.total_work_seconds) / 3600, 2) as total_hours,
                ROUND(AVG(eds.total_work_seconds) / 3600, 2) as avg_hours_per_day
            FROM employee_daily_stats eds
            INNER JOIN employees e ON eds.userid = e.USERID
            LEFT JOIN departments d ON e.DEFAULTDEPTID = d.deptid
            WHERE eds.work_date >= %s AND eds.work_date < %s
            GROUP BY e.USERID, e.Name, e.Badgenumber, d.deptid, d.deptname
            ORDER BY avg_hours_per_day DESC, e.Name ASC
            """
            
            rows = fetch_query(sql, [start, end])
            
            # Process rows to convert timedelta to strings and add ranking
            processed_rows = []
            rank = 1
            for row in rows:
                row_dict = dict(row)
                
                # Convert average time fields from timedelta to string
                for field in ['avg_am_time_in', 'avg_am_time_out', 'avg_pm_time_in', 'avg_pm_time_out']:
                    if field in row_dict and row_dict[field] is not None:
                        row_dict[field] = EmployeeDailyStats._convert_timedelta_to_time_str(row_dict[field])
                
                # Add rank
                row_dict['rank'] = rank
                rank += 1
                
                processed_rows.append(row_dict)
            
            return {
                "statusCode": 200,
                "month": month,
                "count": len(processed_rows),
                "data": processed_rows
            } if processed_rows else {
                "statusCode": 404,
                "message": f"No employee stats found for {month}"
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # --------------------------
    # Get detailed stats for specific employee with daily breakdown
    # --------------------------
    @staticmethod
    def get_employee_detailed_stats(user_id: int, month: str):
        try:
            start = datetime.strptime(month + "-01", "%Y-%m-%d")
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)

            # Get employee info
            employee_sql = """
            SELECT 
                e.USERID,
                e.Name as employee_name,
                e.Badgenumber as badge_number,
                d.deptid as department_id,
                d.deptname as department_name
            FROM employees e
            LEFT JOIN departments d ON e.DEFAULTDEPTID = d.deptid
            WHERE e.USERID = %s
            """
            employee_info = fetch_query(employee_sql, [user_id])
            
            if not employee_info:
                return {
                    "statusCode": 404,
                    "message": f"Employee {user_id} not found"
                }

            # Get daily stats
            stats_sql = """
            SELECT *
            FROM employee_daily_stats
            WHERE userid = %s AND work_date >= %s AND work_date < %s
            ORDER BY work_date DESC
            """
            daily_stats = fetch_query(stats_sql, [user_id, start, end])
            processed_stats = EmployeeDailyStats._process_rows(daily_stats)

            # Calculate summary
            total_days = len(daily_stats)
            total_am_seconds = sum(row.get('am_work_seconds', 0) or 0 for row in daily_stats)
            total_pm_seconds = sum(row.get('pm_work_seconds', 0) or 0 for row in daily_stats)
            total_work_seconds = sum(row.get('total_work_seconds', 0) or 0 for row in daily_stats)
            total_hours = round(total_work_seconds / 3600, 2)

            return {
                "statusCode": 200,
                "employee": employee_info[0],
                "summary": {
                    "month": month,
                    "total_days_worked": total_days,
                    "total_am_seconds": total_am_seconds,
                    "total_pm_seconds": total_pm_seconds,
                    "total_work_seconds": total_work_seconds,
                    "total_hours": total_hours
                },
                "daily_records": processed_stats
            }

        except Exception as e:
            return {"statusCode": 500, "message": str(e)}