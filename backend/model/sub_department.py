from gateway.mysql_gateway import fetch_query, query, query_insert


class SubDepartment:

    # ── get the sub-dept managed by this employee ────────────────────────────
    @staticmethod
    def get_by_owner(owner_id: int):
        try:
            rows = fetch_query(
                """
                SELECT  d.deptid AS id, d.deptname AS name,
                        d.supdeptid AS parent_dept_id,
                        p.deptname  AS parent_dept_name,
                        dm.employee_id AS owner_id
                FROM    department_managers dm
                JOIN    departments d ON d.deptid   = dm.dept_id
                LEFT JOIN departments p ON p.deptid = d.supdeptid
                WHERE   dm.employee_id = %s
                LIMIT   1
                """,
                [owner_id],
            )
            if not rows:
                return {"statusCode": 404, "data": None}
            return {"statusCode": 200, "data": rows[0]}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # ── create a new sub-dept inside departments table + assign manager ──────
    @staticmethod
    def create(name: str, owner_id: int, parent_dept_id: int):
        try:
            # Get next available deptid (table may not have AUTO_INCREMENT)
            id_rows = fetch_query("SELECT COALESCE(MAX(deptid), 0) + 1 AS next_id FROM departments", [])
            new_dept_id = id_rows[0]["next_id"]

            # Insert into departments with explicit deptid
            result = query(
                "INSERT INTO departments (deptid, deptname, supdeptid) VALUES (%s, %s, %s)",
                [new_dept_id, name, parent_dept_id],
            )
            if result["statusCode"] != 200:
                return result

            # Assign manager
            result2 = query(
                "INSERT INTO department_managers (dept_id, employee_id) VALUES (%s, %s)",
                [new_dept_id, owner_id],
            )
            if result2["statusCode"] != 200:
                return result2

            return {"statusCode": 201, "id": new_dept_id}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # ── rename ───────────────────────────────────────────────────────────────
    @staticmethod
    def rename(dept_id: int, owner_id: int, name: str):
        try:
            name = name.strip()
            if not name:
                return {"statusCode": 400, "message": "Name cannot be empty"}
            # Verify ownership
            rows = fetch_query(
                "SELECT id FROM department_managers WHERE dept_id = %s AND employee_id = %s",
                [dept_id, owner_id],
            )
            if not rows:
                return {"statusCode": 403, "message": "Not authorized"}
            return query(
                "UPDATE departments SET deptname = %s WHERE deptid = %s",
                [name, dept_id],
            )
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # ── members (via sub_department_members join table) ──────────────────────
    @staticmethod
    def get_members(dept_id: int):
        try:
            rows = fetch_query(
                """
                SELECT  e.userid, e.Name AS name, e.Badgenumber AS badge,
                        e.role, ea.avatar_url
                FROM    sub_department_members sdm
                JOIN    employees e  ON e.userid    = sdm.employee_id
                LEFT JOIN employee_avatars ea ON ea.user_id = e.userid
                WHERE   sdm.dept_id = %s
                ORDER BY e.Name
                """,
                [dept_id],
            )
            return {"statusCode": 200, "data": rows}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def add_member(dept_id: int, employee_id: int):
        try:
            return query(
                "INSERT IGNORE INTO sub_department_members (dept_id, employee_id) VALUES (%s, %s)",
                [dept_id, employee_id],
            )
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    @staticmethod
    def remove_member(dept_id: int, employee_id: int):
        try:
            return query(
                "DELETE FROM sub_department_members WHERE dept_id = %s AND employee_id = %s",
                [dept_id, employee_id],
            )
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # ── membership: find sub-dept for any user (owner OR member) ─────────────
    @staticmethod
    def get_membership(user_id: int):
        """
        Find which sub-dept this user belongs to (as owner OR member),
        return sub-dept info + all members + today's check-in status for each.
        """
        try:
            # Find sub-dept id — owner first, then member
            rows = fetch_query(
                """
                SELECT dept_id AS id FROM department_managers WHERE employee_id = %s
                UNION
                SELECT dept_id AS id FROM sub_department_members WHERE employee_id = %s
                LIMIT 1
                """,
                [user_id, user_id],
            )
            if not rows:
                return {"statusCode": 404, "data": None}

            dept_id = rows[0]["id"]

            # Sub-dept info
            dept_rows = fetch_query(
                """
                SELECT d.deptid AS id, d.deptname AS name,
                       p.deptname AS parent_dept_name
                FROM   departments d
                LEFT JOIN departments p ON p.deptid = d.supdeptid
                WHERE  d.deptid = %s
                """,
                [dept_id],
            )
            if not dept_rows:
                return {"statusCode": 404, "data": None}
            sub_dept = dept_rows[0]

            # Members
            members = fetch_query(
                """
                SELECT e.userid, e.Name AS name, e.Badgenumber AS badge,
                       e.role, ea.avatar_url
                FROM   sub_department_members sdm
                JOIN   employees e ON e.userid = sdm.employee_id
                LEFT JOIN employee_avatars ea ON ea.user_id = e.userid
                WHERE  sdm.dept_id = %s
                ORDER BY e.Name
                """,
                [dept_id],
            )

            # Today's attendance — get latest checktype per user
            if members:
                member_ids = [m["userid"] for m in members]
                placeholders = ",".join(["%s"] * len(member_ids))
                att_rows = fetch_query(
                    f"""
                    SELECT a.userid, a.checktype
                    FROM   attendance a
                    INNER JOIN (
                        SELECT userid, MAX(checktime) AS latest
                        FROM   attendance
                        WHERE  DATE(checktime) = CURDATE()
                          AND  userid IN ({placeholders})
                        GROUP BY userid
                    ) latest_att ON a.userid = latest_att.userid
                               AND a.checktime = latest_att.latest
                    """,
                    member_ids,
                )
                status_map = {r["userid"]: r["checktype"] for r in att_rows}
                for m in members:
                    m["is_online"] = status_map.get(m["userid"]) == "I"

            sub_dept["members"] = members
            return {"statusCode": 200, "data": sub_dept}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # ── candidates: all employees in parent dept not already a member ─────────
    @staticmethod
    def search_candidates(dept_id: int, parent_dept_id: int, term: str = ""):
        try:
            if term.strip():
                pattern = f"%{term.strip()}%"
                where_term = "AND (e.Name LIKE %s OR e.Badgenumber LIKE %s)"
                params = [parent_dept_id, pattern, pattern, dept_id]
            else:
                where_term = ""
                params = [parent_dept_id, dept_id]

            rows = fetch_query(
                f"""
                SELECT  e.userid, e.Name AS name, e.Badgenumber AS badge,
                        e.role, ea.avatar_url
                FROM    employees e
                LEFT JOIN employee_avatars ea ON ea.user_id = e.userid
                WHERE   e.DEFAULTDEPTID = %s
                  {where_term}
                  AND   e.userid NOT IN (
                            SELECT employee_id FROM sub_department_members
                            WHERE  dept_id = %s
                        )
                ORDER BY e.Name
                LIMIT 50
                """,
                params,
            )
            return {"statusCode": 200, "data": rows}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
