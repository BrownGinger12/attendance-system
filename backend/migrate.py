import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os

load_dotenv()

config = {
    "host": os.getenv("MYSQL_HOST"),
    "user": os.getenv("MYSQL_USER"),
    "password": os.getenv("MYSQL_PASSWORD"),
    "database": os.getenv("MYSQL_DB"),
}

def migrate():
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        print("✅ Connected to MySQL")

        # =========================
        # Departments
        # =========================
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            deptid INT PRIMARY KEY,
            deptname VARCHAR(100),
            supdeptid INT,
            InheritParentSch INT,
            InheritDeptSch INT,
            InheritDeptSchClass INT,
            AutoSchPlan INT,
            InLate INT,
            OutEarly INT,
            InheritDeptRule INT,
            MinAutoSchInterval INT,
            RegisterOT INT,
            DefaultSchId INT,
            ATT INT,
            Holiday INT,
            OverTime INT,
            INDEX idx_supdept (supdeptid)
        ) ENGINE=InnoDB;
        """)

        # =========================
        # Employees
        # =========================
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            userid INT PRIMARY KEY,
            badgenumber VARCHAR(50),
            name VARCHAR(100),
            defaultdeptid INT,
            SSN VARCHAR(50),
            Gender VARCHAR(10),
            TITLE VARCHAR(50),
            PAGER VARCHAR(50),
            BIRTHDAY VARCHAR(20),
            HIREDDAY VARCHAR(20),
            street VARCHAR(100),
            CITY VARCHAR(50),
            STATE VARCHAR(50),
            ZIP VARCHAR(20),
            OPHONE VARCHAR(50),
            FPHONE VARCHAR(50),
            VERIFICATIONMETHOD INT,
            SECURITYFLAGS INT,
            ATT INT,
            INLATE INT,
            OUTEARLY INT,
            OVERTIME INT,
            SEP INT,
            HOLIDAY INT,
            MINZU VARCHAR(50),
            PASSWORD VARCHAR(255),
            LUNCHDURATION INT,
            PHOTO LONGBLOB,
            mverifypass VARCHAR(255),
            Notes TEXT,
            privilege INT,
            InheritDeptSch INT,
            InheritDeptSchClass INT,
            AutoSchPlan INT,
            MinAutoSchInterval INT,
            RegisterOT INT,
            InheritDeptRule INT,
            EMPRIVILEGE INT,
            CardNo VARCHAR(50),
            FaceGroup INT,
            AccGroup INT,
            UseAccGroupTZ INT,
            VerifyCode INT,
            Expires INT,
            ValidCount INT,
            ValidTimeBegin VARCHAR(20),
            ValidTimeEnd VARCHAR(20),
            TimeZone1 INT,
            TimeZone2 INT,
            TimeZone3 INT,
            Pin1 VARCHAR(50),
            schedule_type VARCHAR(50),
            INDEX idx_emp_dept (defaultdeptid)
        ) ENGINE=InnoDB;
        """)

        # =========================
        # Attendance
        # =========================
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            userid INT NOT NULL,
            checktime DATETIME NOT NULL,
            checktype VARCHAR(5),
            verifycode INT,
            sensorid VARCHAR(20),
            sn VARCHAR(50),
            UNIQUE KEY uniq_att (userid, checktime),
            INDEX idx_att_user (userid),
            INDEX idx_att_time (checktime)
        ) ENGINE=InnoDB;
        """)

        conn.commit()
        print("✅ Migration completed successfully")

    except Error as e:
        print("❌ Migration failed:", e)

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate()
