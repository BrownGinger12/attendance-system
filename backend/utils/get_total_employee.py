from backend.gateway.microsoft_db_gateway import get_connection


def get_total_employees():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM Employees")
    total = cursor.fetchone()[0]
    conn.close()
    return total