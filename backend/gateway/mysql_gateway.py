# gateway/mysql_db_gateway.py
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        autocommit=True
    )

def fetch_query(sql, params=None):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or [])
        return cursor.fetchall()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def query(sql, params=None):
    """
    Executes an INSERT, UPDATE, DELETE, or other write query.
    Returns a dict with statusCode and message.
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql, params or [])
        conn.commit()
        return {"statusCode": 200, "message": "Query executed successfully"}
    except mysql.connector.Error as e:
        return {"statusCode": 500, "message": str(e)}
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
