import pyodbc
import pymysql
import os
import time
import shutil
import tempfile
from datetime import datetime, date, timedelta
from datetime import time as dtime
from dotenv import load_dotenv

load_dotenv()

# ------------------------
# Environment / DB config
# ------------------------
ACCESS_DB_PATH = os.getenv("ACCESS_DB_PATH")
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DB = os.getenv("MYSQL_DATABASE")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))

# ------------------------
# Create a temporary copy of the Access DB
# ------------------------
def get_temp_copy():
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, os.path.basename(ACCESS_DB_PATH))
    shutil.copy2(ACCESS_DB_PATH, temp_path)
    return temp_path

# ------------------------
# Access connection
# ------------------------
def get_access_conn(temp_path):
    conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={temp_path};"
        "ReadOnly=True;"
    )
    return pyodbc.connect(conn_str)

# ------------------------
# MySQL connection
# ------------------------
def get_mysql_conn():
    return pymysql.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        port=MYSQL_PORT,
        autocommit=True
    )

# ------------------------
# Get MySQL table columns
# ------------------------
def get_mysql_columns(table_name):
    """Get list of columns from MySQL table"""
    mysql_conn = get_mysql_conn()
    mysql_cursor = mysql_conn.cursor()
    mysql_cursor.execute(f"DESCRIBE {table_name}")
    columns = [row[0] for row in mysql_cursor.fetchall()]
    mysql_cursor.close()
    mysql_conn.close()
    return columns

# ------------------------
# Update Employee Daily Stats
# ------------------------
def update_employee_daily_stats(affected_dates):
    """
    Update ONLY existing employee_daily_stats records (no inserts)
    """
    try:
        if not affected_dates:
            return

        mysql_conn = get_mysql_conn()
        mysql_cursor = mysql_conn.cursor()

        for work_date in affected_dates:
            sql = """
            UPDATE employee_daily_stats eds
            INNER JOIN (
                SELECT
                    t.userid,
                    DATE(t.checktime) AS work_date,
                    
                    /* ===================== AM ===================== */
                    MIN(CASE 
                        WHEN t.checktype = 'I' 
                        AND TIME(t.checktime) < '12:30:00'
                        AND TIME(t.checktime) < '11:00:00'
                        THEN TIME(t.checktime) 
                    END) AS am_time_in,
                    
                    MAX(CASE 
                        WHEN TIME(t.checktime) < '12:30:00'
                        AND (
                            t.checktype = 'O'
                            OR (t.checktype = 'I' AND TIME(t.checktime) >= '11:00:00')
                        )
                        THEN TIME(t.checktime)
                    END) AS am_time_out,
                    
                    CASE
                        WHEN MIN(CASE 
                            WHEN t.checktype = 'I' 
                            AND TIME(t.checktime) < '12:30:00'
                            AND TIME(t.checktime) < '11:00:00'
                            THEN TIME(t.checktime) 
                        END) IS NOT NULL
                        AND MAX(CASE 
                            WHEN TIME(t.checktime) < '12:30:00'
                            AND (
                                t.checktype = 'O'
                                OR (t.checktype = 'I' AND TIME(t.checktime) >= '11:00:00')
                            )
                            THEN TIME(t.checktime)
                        END) IS NOT NULL
                        THEN TIMESTAMPDIFF(SECOND,
                            CONCAT(DATE(t.checktime), ' ', MIN(CASE 
                                WHEN t.checktype = 'I' 
                                AND TIME(t.checktime) < '12:30:00'
                                AND TIME(t.checktime) < '11:00:00'
                                THEN TIME(t.checktime) 
                            END)),
                            CONCAT(DATE(t.checktime), ' ', 
                                LEAST(
                                    MAX(CASE 
                                        WHEN TIME(t.checktime) < '12:30:00'
                                        AND (
                                            t.checktype = 'O'
                                            OR (t.checktype = 'I' AND TIME(t.checktime) >= '11:00:00')
                                        )
                                        THEN TIME(t.checktime)
                                    END),
                                    '12:00:00'
                                )
                            )
                        )
                        ELSE 0
                    END AS am_work_seconds,
                    
                    /* ===================== PM ===================== */
                    MIN(CASE 
                        WHEN t.checktype = 'I' 
                        AND TIME(t.checktime) >= '12:30:00'
                        AND TIME(t.checktime) < '16:00:00'
                        THEN TIME(t.checktime) 
                    END) AS pm_time_in,
                    
                    MAX(CASE 
                        WHEN TIME(t.checktime) >= '12:30:00'
                        AND (
                            t.checktype = 'O'
                            OR (t.checktype = 'I' AND TIME(t.checktime) >= '16:00:00')
                        )
                        THEN TIME(t.checktime)
                    END) AS pm_time_out,
                    
                    CASE
                        WHEN MIN(CASE 
                            WHEN t.checktype = 'I' 
                            AND TIME(t.checktime) >= '12:30:00'
                            AND TIME(t.checktime) < '16:00:00'
                            THEN TIME(t.checktime) 
                        END) IS NOT NULL
                        AND MAX(CASE 
                            WHEN TIME(t.checktime) >= '12:30:00'
                            AND (
                                t.checktype = 'O'
                                OR (t.checktype = 'I' AND TIME(t.checktime) >= '16:00:00')
                            )
                            THEN TIME(t.checktime)
                        END) IS NOT NULL
                        THEN TIMESTAMPDIFF(SECOND,
                            CONCAT(DATE(t.checktime), ' ',
                                GREATEST(
                                    MIN(CASE 
                                        WHEN t.checktype = 'I' 
                                        AND TIME(t.checktime) >= '12:30:00'
                                        AND TIME(t.checktime) < '16:00:00'
                                        THEN TIME(t.checktime) 
                                    END),
                                    '13:00:00'
                                )
                            ),
                            CONCAT(DATE(t.checktime), ' ', 
                                LEAST(
                                    MAX(CASE 
                                        WHEN TIME(t.checktime) >= '12:30:00'
                                        AND (
                                            t.checktype = 'O'
                                            OR (t.checktype = 'I' AND TIME(t.checktime) >= '16:00:00')
                                        )
                                        THEN TIME(t.checktime)
                                    END),
                                    '17:00:00'
                                )
                            )
                        )
                        ELSE 0
                    END AS pm_work_seconds,
                    
                    COALESCE(
                        CASE
                            WHEN MIN(CASE 
                                WHEN t.checktype = 'I' 
                                AND TIME(t.checktime) < '12:30:00'
                                AND TIME(t.checktime) < '11:00:00'
                                THEN TIME(t.checktime) 
                            END) IS NOT NULL
                            AND MAX(CASE 
                                WHEN TIME(t.checktime) < '12:30:00'
                                AND (
                                    t.checktype = 'O'
                                    OR (t.checktype = 'I' AND TIME(t.checktime) >= '11:00:00')
                                )
                                THEN TIME(t.checktime)
                            END) IS NOT NULL
                            THEN TIMESTAMPDIFF(SECOND,
                                CONCAT(DATE(t.checktime), ' ', MIN(CASE 
                                    WHEN t.checktype = 'I' 
                                    AND TIME(t.checktime) < '12:30:00'
                                    AND TIME(t.checktime) < '11:00:00'
                                    THEN TIME(t.checktime) 
                                END)),
                                CONCAT(DATE(t.checktime), ' ', 
                                    LEAST(
                                        MAX(CASE 
                                            WHEN TIME(t.checktime) < '12:30:00'
                                            AND (
                                                t.checktype = 'O'
                                                OR (t.checktype = 'I' AND TIME(t.checktime) >= '11:00:00')
                                            )
                                            THEN TIME(t.checktime)
                                        END),
                                        '12:00:00'
                                    )
                                )
                            )
                            ELSE 0
                        END, 0
                    ) + COALESCE(
                        CASE
                            WHEN MIN(CASE 
                                WHEN t.checktype = 'I' 
                                AND TIME(t.checktime) >= '12:30:00'
                                AND TIME(t.checktime) < '16:00:00'
                                THEN TIME(t.checktime) 
                            END) IS NOT NULL
                            AND MAX(CASE 
                                WHEN TIME(t.checktime) >= '12:30:00'
                                AND (
                                    t.checktype = 'O'
                                    OR (t.checktype = 'I' AND TIME(t.checktime) >= '16:00:00')
                                )
                                THEN TIME(t.checktime)
                            END) IS NOT NULL
                            THEN TIMESTAMPDIFF(SECOND,
                                CONCAT(DATE(t.checktime), ' ',
                                    GREATEST(
                                        MIN(CASE 
                                            WHEN t.checktype = 'I' 
                                            AND TIME(t.checktime) >= '12:30:00'
                                            AND TIME(t.checktime) < '16:00:00'
                                            THEN TIME(t.checktime) 
                                        END),
                                        '13:00:00'
                                    )
                                ),
                                CONCAT(DATE(t.checktime), ' ', 
                                    LEAST(
                                        MAX(CASE 
                                            WHEN TIME(t.checktime) >= '12:30:00'
                                            AND (
                                                t.checktype = 'O'
                                                OR (t.checktype = 'I' AND TIME(t.checktime) >= '16:00:00')
                                            )
                                            THEN TIME(t.checktime)
                                        END),
                                        '17:00:00'
                                    )
                                )
                            )
                            ELSE 0
                        END, 0
                    ) AS total_work_seconds

                FROM attendance t
                WHERE DATE(t.checktime) = %s
                GROUP BY t.userid, DATE(t.checktime)
            ) AS calculated
            ON eds.userid = calculated.userid AND eds.work_date = calculated.work_date
            SET 
                eds.am_time_in = calculated.am_time_in,
                eds.am_time_out = calculated.am_time_out,
                eds.am_work_seconds = calculated.am_work_seconds,
                eds.pm_time_in = calculated.pm_time_in,
                eds.pm_time_out = calculated.pm_time_out,
                eds.pm_work_seconds = calculated.pm_work_seconds,
                eds.total_work_seconds = calculated.total_work_seconds,
                eds.updated_at = CURRENT_TIMESTAMP
            """
            
            mysql_cursor.execute(sql, (work_date,))
        
        mysql_cursor.close()
        mysql_conn.close()
        print(f"✓ Updated employee_daily_stats for {len(affected_dates)} date(s)")
        
    except Exception as e:
        print("Error updating employee daily stats:", e)
        import traceback
        traceback.print_exc()

# ------------------------
# DEPARTMENTS SYNC (full history)
# ------------------------
def sync_departments():
    try:
        temp_path = get_temp_copy()
        access_conn = get_access_conn(temp_path)
        access_cursor = access_conn.cursor()
        access_cursor.execute("SELECT * FROM DEPARTMENTS")
        rows = access_cursor.fetchall()
        columns = [column[0] for column in access_cursor.description]
        access_cursor.close()
        access_conn.close()
        os.remove(temp_path)

        if not rows:
            print("No departments found in Access DB.")
            return

        mysql_conn = get_mysql_conn()
        mysql_cursor = mysql_conn.cursor()
        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)
        update_str = ", ".join([f"{col} = VALUES({col})" for col in columns])

        sql = f"""
        INSERT INTO departments ({columns_str})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_str}
        """

        for row in rows:
            mysql_cursor.execute(sql, tuple(row))

        mysql_cursor.close()
        mysql_conn.close()
        print(f"Synced {len(rows)} departments from Access to MySQL.")

    except Exception as e:
        print("Department poller error:", e)
        import traceback
        traceback.print_exc()

# ------------------------
# EMPLOYEES SYNC (only new employees)
# ------------------------
def sync_employees():
    try:
        temp_path = get_temp_copy()
        access_conn = get_access_conn(temp_path)
        access_cursor = access_conn.cursor()
        access_cursor.execute("SELECT * FROM USERINFO")
        rows = access_cursor.fetchall()
        columns = [column[0] for column in access_cursor.description]
        access_cursor.close()
        access_conn.close()
        os.remove(temp_path)

        if not rows:
            print("No employees found in Access DB.")
            return

        mysql_conn = get_mysql_conn()
        mysql_cursor = mysql_conn.cursor()

        if "schedule_type" not in columns:
            columns.append("schedule_type")

        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)

        # Use INSERT IGNORE to only add new employees, skip existing ones
        sql = f"""
        INSERT IGNORE INTO employees ({columns_str})
        VALUES ({placeholders})
        """

        inserted_count = 0
        for row in rows:
            row_tuple = tuple(list(row) + ["normal"])
            result = mysql_cursor.execute(sql, row_tuple)
            if mysql_cursor.rowcount > 0:
                inserted_count += 1

        mysql_cursor.close()
        mysql_conn.close()
        print(f"Added {inserted_count} new employees from Access to MySQL (skipped {len(rows) - inserted_count} existing).")

    except Exception as e:
        print("Employee poller error:", e)
        import traceback
        traceback.print_exc()

# ------------------------
# ATTENDANCE SYNC (only new records)
# ------------------------
def sync_attendance():
    try:
        # First, get the last CHECKTIME from MySQL attendance table
        mysql_conn = get_mysql_conn()
        mysql_cursor = mysql_conn.cursor()
        
        # Find the CHECKTIME column name (case-insensitive)
        mysql_columns = get_mysql_columns('attendance')
        checktime_col = None
        for col in mysql_columns:
            if col.lower() == 'checktime':
                checktime_col = col
                break
        
        if not checktime_col:
            print("Error: CHECKTIME column not found in attendance table")
            mysql_cursor.close()
            mysql_conn.close()
            return
        
        # Get the maximum CHECKTIME from the attendance table
        mysql_cursor.execute(f"SELECT MAX({checktime_col}) FROM attendance")
        result = mysql_cursor.fetchone()
        last_checktime = result[0] if result and result[0] else None
        mysql_cursor.close()
        mysql_conn.close()

        # Now query Access DB for records newer than the last one in MySQL
        temp_path = get_temp_copy()
        access_conn = get_access_conn(temp_path)
        access_cursor = access_conn.cursor()

        if last_checktime:
            # Get records after the last one in the database
            query = "SELECT * FROM CHECKINOUT WHERE CHECKTIME > ? ORDER BY CHECKTIME"
            access_cursor.execute(query, (last_checktime,))
            print(f"Checking for records after {last_checktime}...")
        else:
            # No records in MySQL yet, get all records from today onwards
            today_start = datetime.combine(date.today(), dtime.min)
            query = "SELECT * FROM CHECKINOUT WHERE CHECKTIME >= ? ORDER BY CHECKTIME"
            access_cursor.execute(query, (today_start,))
            print(f"No existing records. Fetching from {today_start}...")

        rows = access_cursor.fetchall()
        access_columns = [column[0] for column in access_cursor.description]
        access_cursor.close()
        access_conn.close()
        os.remove(temp_path)

        if not rows:
            print("No new attendance records to sync.")
            return

        # Get MySQL table columns (excluding auto-increment 'id')
        mysql_columns = get_mysql_columns('attendance')
        mysql_columns = [col for col in mysql_columns if col != 'id']
        
        # Find matching columns (case-insensitive)
        access_columns_lower = {col.lower(): col for col in access_columns}
        mysql_columns_lower = {col.lower(): col for col in mysql_columns}
        
        # Get columns that exist in both databases
        matching_columns_lower = set(access_columns_lower.keys()) & set(mysql_columns_lower.keys())
        
        # Build column mapping (Access column name -> index in row)
        column_mapping = []
        for col_lower in matching_columns_lower:
            access_col = access_columns_lower[col_lower]
            mysql_col = mysql_columns_lower[col_lower]
            index = access_columns.index(access_col)
            column_mapping.append((mysql_col, index))
        
        # Sort by MySQL column name for consistency
        column_mapping.sort(key=lambda x: x[0])
        
        mysql_col_names = [col for col, _ in column_mapping]
        access_col_indices = [idx for _, idx in column_mapping]

        # Insert the new records into MySQL
        mysql_conn = get_mysql_conn()
        mysql_cursor = mysql_conn.cursor()
        placeholders = ", ".join(["%s"] * len(mysql_col_names))
        columns_str = ", ".join(mysql_col_names)
        update_str = ", ".join([f"{col} = VALUES({col})" for col in mysql_col_names])

        sql = f"""
        INSERT INTO attendance ({columns_str})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_str}
        """

        # Find the CHECKTIME column index in Access results
        checktime_index = access_columns.index("CHECKTIME")
        newest_checktime = None
        
        # Track affected dates for employee_daily_stats update
        affected_dates = set()

        # Insert all rows
        for row in rows:
            # Extract only the values for matching columns
            values = tuple(row[idx] for idx in access_col_indices)
            mysql_cursor.execute(sql, values)
            
            # Track the newest CHECKTIME
            current_checktime = row[checktime_index]
            if newest_checktime is None or current_checktime > newest_checktime:
                newest_checktime = current_checktime
            
            # Track affected date for daily stats update
            if isinstance(current_checktime, datetime):
                affected_dates.add(current_checktime.date())

        mysql_cursor.close()
        mysql_conn.close()
        
        print(f"✓ Synced {len(rows)} new attendance records. Newest: {newest_checktime}")
        
        # Update employee daily stats for affected dates
        if affected_dates:
            print(f"Updating daily stats for {len(affected_dates)} affected date(s)...")
            update_employee_daily_stats(sorted(affected_dates))

    except Exception as e:
        print("Attendance poller error:", e)
        import traceback
        traceback.print_exc()

# ------------------------
# MAIN LOOP
# ------------------------
if __name__ == "__main__":
    print("Starting Access -> MySQL poller...")

    # Full sync for departments and employees
    sync_departments()
    sync_employees()

    # Poll attendance continuously
    while True:
        sync_attendance()
        time.sleep(2)  # poll every 2 seconds