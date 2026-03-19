import pyodbc
import mysql.connector

# -----------------------------------
# CONFIGURATION
# -----------------------------------

ACCESS_DB_PATH = r"C:\\Users\\miles\\OneDrive\\Desktop\\Files\\mbs\\eFRS-original_be.accdb"

MYSQL_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "efrs-original_be"
}

BATCH_SIZE = 500  # You can increase to 1000 if RAM is good


# -----------------------------------
# CONNECT TO ACCESS
# -----------------------------------

print("Connecting to Access...")
access_conn = pyodbc.connect(
    rf"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={ACCESS_DB_PATH};"
)
access_cursor = access_conn.cursor()

print("Connected to Access.")


# -----------------------------------
# CONNECT TO MYSQL
# -----------------------------------

print("Connecting to MySQL...")
mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
mysql_cursor = mysql_conn.cursor()

mysql_cursor.execute("SET FOREIGN_KEY_CHECKS=0;")

print("Connected to MySQL.")


# -----------------------------------
# GET ALL USER TABLES
# -----------------------------------

tables = []
for row in access_cursor.tables(tableType='TABLE'):
    if not row.table_name.startswith("MSys"):
        tables.append(row.table_name)

print(f"\nFound {len(tables)} tables.\n")


# -----------------------------------
# MIGRATION LOOP
# -----------------------------------

for table in tables:
    try:
        mysql_table = table.lower()  # MySQL tables are lowercase
        print(f"Migrating {table} -> {mysql_table}...")

        # Fetch data from Access
        access_cursor.execute(f"SELECT * FROM [{table}]")
        columns = [column[0] for column in access_cursor.description]
        rows = access_cursor.fetchall()

        if not rows:
            print(f"{table} is empty. Skipping.\n")
            continue

        # Prepare insert query
        placeholders = ", ".join(["%s"] * len(columns))
        column_names = ", ".join(f"`{col}`" for col in columns)

        insert_query = f"""
            INSERT INTO `{mysql_table}` ({column_names})
            VALUES ({placeholders})
        """

        # Batch insert
        batch = []
        total_inserted = 0

        for row in rows:
            batch.append(tuple(row))

            if len(batch) >= BATCH_SIZE:
                mysql_cursor.executemany(insert_query, batch)
                mysql_conn.commit()
                total_inserted += len(batch)
                batch.clear()

        # Insert remaining rows
        if batch:
            mysql_cursor.executemany(insert_query, batch)
            mysql_conn.commit()
            total_inserted += len(batch)

        print(f"{table}: {total_inserted} rows migrated.\n")

    except Exception as e:
        print(f"❌ Error migrating {table}: {e}\n")
        mysql_conn.rollback()


# -----------------------------------
# FINISH
# -----------------------------------

mysql_cursor.execute("SET FOREIGN_KEY_CHECKS=1;")

access_cursor.close()
access_conn.close()
mysql_cursor.close()
mysql_conn.close()

print("✅ Migration complete!")