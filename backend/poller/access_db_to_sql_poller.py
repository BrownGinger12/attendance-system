import pyodbc
import pymysql
import os
import time
import shutil
import tempfile
from datetime import datetime, date
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
last_attendance_check = None

def sync_attendance():
    global last_attendance_check
    try:
        temp_path = get_temp_copy()
        access_conn = get_access_conn(temp_path)
        access_cursor = access_conn.cursor()

        if last_attendance_check:
            query = "SELECT * FROM CHECKINOUT WHERE CHECKTIME > ? ORDER BY CHECKTIME"
            access_cursor.execute(query, (last_attendance_check,))
        else:
            today_start = datetime.combine(date.today(), dtime.min)
            query = "SELECT * FROM CHECKINOUT WHERE CHECKTIME >= ? ORDER BY CHECKTIME"
            access_cursor.execute(query, (today_start,))

        rows = access_cursor.fetchall()
        access_columns = [column[0] for column in access_cursor.description]
        access_cursor.close()
        access_conn.close()
        os.remove(temp_path)

        if not rows:
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

        for row in rows:
            # Extract only the values for matching columns
            values = tuple(row[idx] for idx in access_col_indices)
            mysql_cursor.execute(sql, values)
            last_attendance_check = row[access_columns.index("CHECKTIME")]

        mysql_cursor.close()
        mysql_conn.close()
        print(f"Synced {len(rows)} new attendance records (using {len(mysql_col_names)} matching columns).")

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