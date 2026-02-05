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
CHECKPOINT_FILE = "attendance_checkpoint.txt"

def get_last_checkpoint():
    """Read the last checkpoint timestamp from file"""
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, 'r') as f:
                timestamp_str = f.read().strip()
                if timestamp_str:
                    checkpoint = datetime.fromisoformat(timestamp_str)
                    print(f"[DEBUG] Loaded checkpoint: {checkpoint} (type: {type(checkpoint)})")
                    return checkpoint
        except Exception as e:
            print(f"Error reading checkpoint: {e}")
    return None

def save_checkpoint(timestamp):
    """Save the checkpoint timestamp to file"""
    try:
        # Handle both datetime objects and strings
        if isinstance(timestamp, datetime):
            timestamp_str = timestamp.isoformat()
        else:
            # If it's already a datetime from Access, convert to datetime if needed
            if hasattr(timestamp, 'isoformat'):
                timestamp_str = timestamp.isoformat()
            else:
                timestamp_str = str(timestamp)
        
        with open(CHECKPOINT_FILE, 'w') as f:
            f.write(timestamp_str)
        print(f"[DEBUG] Saved checkpoint: {timestamp_str}")
    except Exception as e:
        print(f"Error saving checkpoint: {e}")

def sync_attendance():
    try:
        temp_path = get_temp_copy()
        access_conn = get_access_conn(temp_path)
        access_cursor = access_conn.cursor()

        last_checkpoint = get_last_checkpoint()
        
        if last_checkpoint:
            # Use > to get only records AFTER the last checkpoint
            print(f"[DEBUG] Looking for records after: {last_checkpoint}")
            query = "SELECT * FROM CHECKINOUT WHERE CHECKTIME > ? ORDER BY CHECKTIME"
            access_cursor.execute(query, (last_checkpoint,))
        else:
            # First run - sync all records
            print("[DEBUG] First run - syncing all records")
            query = "SELECT * FROM CHECKINOUT ORDER BY CHECKTIME"
            access_cursor.execute(query)

        rows = access_cursor.fetchall()
        access_columns = [column[0] for column in access_cursor.description]
        
        # Debug: show what we found
        if rows:
            print(f"[DEBUG] Found {len(rows)} records to process")
            checktime_idx = access_columns.index("CHECKTIME")
            first_time = rows[0][checktime_idx]
            last_time = rows[-1][checktime_idx]
            print(f"[DEBUG] First record time: {first_time} (type: {type(first_time)})")
            print(f"[DEBUG] Last record time: {last_time} (type: {type(last_time)})")
        else:
            print("[DEBUG] No new records found")
        
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

        latest_timestamp = None
        for row in rows:
            # Extract only the values for matching columns
            values = tuple(row[idx] for idx in access_col_indices)
            mysql_cursor.execute(sql, values)
            # Track the latest timestamp
            checktime = row[access_columns.index("CHECKTIME")]
            if latest_timestamp is None or checktime > latest_timestamp:
                latest_timestamp = checktime

        mysql_cursor.close()
        mysql_conn.close()
        
        # Save the latest timestamp as checkpoint
        if latest_timestamp:
            save_checkpoint(latest_timestamp)
        
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