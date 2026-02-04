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
    Connects to the Access DB. If file is locked, makes a temporary copy for read-only access.
    Returns (connection, tmp_file_path) tuple. tmp_file_path is None if original DB used.
    """
    tmp_file_path = None
    try:
        conn_str = (
            f"DRIVER={{{DRIVER}}};"
            f"DBQ={DB_PATH};"
            f"ReadOnly={'True' if readonly else 'False'};"
        )
        conn = pyodbc.connect(conn_str, autocommit=True)
        return conn, tmp_file_path
    except pyodbc.Error:
        # fallback to temp copy
        tmp_file = tempfile.NamedTemporaryFile(suffix=".accdb", delete=False)
        shutil.copyfile(DB_PATH, tmp_file.name)
        tmp_file_path = tmp_file.name
        conn_str = (
            f"DRIVER={{{DRIVER}}};"
            f"DBQ={tmp_file.name};"
            f"ReadOnly=True;"
        )
        conn = pyodbc.connect(conn_str, autocommit=True)
        return conn, tmp_file_path

def fetch_query(sql, params=None):
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
