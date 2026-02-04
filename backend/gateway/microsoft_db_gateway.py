import pyodbc
import os
import shutil
import tempfile
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("ACCESS_DB_PATH")
DRIVER = "Microsoft Access Driver (*.mdb, *.accdb)"

def get_connection(readonly=True):
    """
    Connect to the Access DB.
    If readonly, creates a temp copy to avoid file locks.
    Returns (conn, tmp_file_path)
    """
    tmp_file_path = None
    if readonly:
        # Make a temporary copy
        tmp_file = tempfile.NamedTemporaryFile(suffix=".accdb", delete=False)
        shutil.copyfile(DB_PATH, tmp_file.name)
        tmp_file_path = tmp_file.name
        conn_str = f"DRIVER={{{DRIVER}}};DBQ={tmp_file.name};ReadOnly=True;"
        conn = pyodbc.connect(conn_str, autocommit=True)
    else:
        conn_str = f"DRIVER={{{DRIVER}}};DBQ={DB_PATH};ReadOnly=False;"
        conn = pyodbc.connect(conn_str, autocommit=True)
    return conn, tmp_file_path

def fetch_query(sql, params=None):
    """
    Execute a SELECT query safely from Access DB
    """
    conn, tmp_file_path = get_connection(readonly=True)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or [])
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
        if tmp_file_path:
            os.remove(tmp_file_path)

def query(sql, params=None):
    """
    Execute INSERT/UPDATE/DELETE queries
    """
    conn, tmp_file_path = get_connection(readonly=False)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or [])
        conn.commit()
        return {"statusCode": 200, "message": "Query executed successfully"}
    except pyodbc.Error as err:
        return {"statusCode": 500, "message": str(err)}
    finally:
        cursor.close()
        conn.close()
        if tmp_file_path:
            os.remove(tmp_file_path)

# Example usage
if __name__ == "__main__":
    # Fetch today's attendance safely
    rows = fetch_query("SELECT * FROM ATTENDANCE ORDER BY CHECKTIME DESC")
    for r in rows:
        print(r)
