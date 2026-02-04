import pyodbc
from dotenv import load_dotenv
import os

load_dotenv()

DB_PATH = os.getenv("ACCESS_DB_PATH")

DRIVER = "Microsoft Access Driver (*.mdb, *.accdb)"

def get_connection(readonly=True):
    conn_str = (
        f"DRIVER={{{DRIVER}}};"
        f"DBQ={DB_PATH};"
        f"ReadOnly={'True' if readonly else 'False'};"
    )
    return pyodbc.connect(conn_str, autocommit=True)

def query(sql, params=None):
    conn = get_connection()
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params or [])

    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return [dict(zip(columns, row)) for row in rows]


