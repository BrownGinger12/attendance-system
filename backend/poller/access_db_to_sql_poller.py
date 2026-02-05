# poller/access_to_mysql.py
import pyodbc
import mysql.connector
import os
import time
import shutil
import tempfile
from datetime import datetime, date, time as dtime
from dotenv import load_dotenv

load_dotenv()

# ------------------------
# Environment / DB config
# ------------------------
ACCESS_DB_PATH = os.getenv("ACCESS_DB_PATH")
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DB = os.getenv("MYSQL_DB")
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
    return mysql.connector.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        port=MYSQL_PORT,
        autocommit=True
    )

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

# ------------------------
# EMPLOYEES SYNC (full history)
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
        update_str = ", ".join([f"{col} = VALUES({col})" for col in columns])

        sql = f"""
        INSERT INTO employees ({columns_str})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_str}
        """

        for row in rows:
            row_tuple = tuple(list(row) + ["normal"])
            mysql_cursor.execute(sql, row_tuple)

        mysql_cursor.close()
        mysql_conn.close()
        print(f"Synced {len(rows)} employees from Access to MySQL.")

    except Exception as e:
        print("Employee poller error:", e)

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
        columns = [column[0] for column in access_cursor.description]
        access_cursor.close()
        access_conn.close()
        os.remove(temp_path)

        if not rows:
            return

        mysql_conn = get_mysql_conn()
        mysql_cursor = mysql_conn.cursor()
        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)
        update_str = ", ".join([f"{col} = VALUES({col})" for col in columns])

        sql = f"""
        INSERT INTO attendance ({columns_str})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_str}
        """

        for row in rows:
            mysql_cursor.execute(sql, tuple(row))
            last_attendance_check = row[columns.index("CHECKTIME")]

        mysql_cursor.close()
        mysql_conn.close()
        print(f"Synced {len(rows)} new attendance records.")

    except Exception as e:
        print("Attendance poller error:", e)

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
