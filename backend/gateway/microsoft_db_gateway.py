import pyodbc
from dotenv import load_dotenv
import os
import shutil
import tempfile

load_dotenv()

DB_PATH = os.getenv("ACCESS_DB_PATH")
DRIVER = "Microsoft Access Driver (*.mdb, *.accdb)"

def get_connection(readonly=True):
    try:
        # Try direct connection first
        conn_str = (
            f"DRIVER={{{DRIVER}}};"
            f"DBQ={DB_PATH};"
            f"ReadOnly={'True' if readonly else 'False'};"
        )
        return pyodbc.connect(conn_str, autocommit=True)
    except pyodbc.Error as err:
        # If it fails due to file lock or volatile DSN, fallback to a temp copy
        tmp_file = tempfile.NamedTemporaryFile(suffix=".accdb", delete=False)
        shutil.copyfile(DB_PATH, tmp_file.name)
        conn_str = (
            f"DRIVER={{{DRIVER}}};"
            f"DBQ={tmp_file.name};"
            f"ReadOnly=True;"
        )
        return pyodbc.connect(conn_str, autocommit=True)

def query(sql, params=None):
    conn = get_connection(readonly=False)
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

def fetch_query(sql, params=None):
    conn = get_connection(readonly=True)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or [])
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
