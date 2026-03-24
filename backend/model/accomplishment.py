from pydantic import BaseModel
from typing import Optional
import math
from datetime import datetime
from gateway.mysql_gateway import fetch_query, query, get_connection

VALID_FILE_TYPES = {"image", "video", "document", "other"}


def _serialize_row(row: dict) -> dict:
    """Convert datetime objects to ISO strings for JSON compatibility."""
    for k, v in row.items():
        if isinstance(v, datetime):
            row[k] = v.isoformat()
    return row


def _attach_files(posts: list) -> list:
    """Attach file records to each post dict."""
    if not posts:
        return posts
    post_ids = [p["id"] for p in posts]
    placeholders = ", ".join(["%s"] * len(post_ids))
    files = fetch_query(
        f"SELECT * FROM accomplishment_files WHERE post_id IN ({placeholders}) ORDER BY created_at ASC",
        post_ids,
    )
    files = [_serialize_row(f) for f in (files or [])]

    files_by_post: dict[int, list] = {}
    for f in files:
        files_by_post.setdefault(f["post_id"], []).append(f)

    for post in posts:
        post["files"] = files_by_post.get(post["id"], [])

    return posts


class Accomplishment(BaseModel):
    id: Optional[int] = None
    user_id: int
    content: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # -------------------------
    # CREATE
    # -------------------------
    @staticmethod
    def create(user_id: int, content: str):
        try:
            if not content or not content.strip():
                return {"statusCode": 400, "message": "Content cannot be empty"}

            conn = get_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO accomplishments (user_id, content) VALUES (%s, %s)",
                        [user_id, content.strip()],
                    )
                    new_id = cursor.lastrowid
                conn.commit()
            finally:
                conn.close()

            return {
                "statusCode": 201,
                "message": "Accomplishment created successfully",
                "id": new_id,
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # READ — single post with files
    # -------------------------
    @staticmethod
    def get_by_id(post_id: int):
        try:
            rows = fetch_query(
                "SELECT * FROM accomplishments WHERE id = %s",
                [post_id],
            )
            if not rows:
                return {"statusCode": 404, "message": "Accomplishment not found"}

            post = _serialize_row(dict(rows[0]))
            _attach_files([post])
            return {"statusCode": 200, "data": post}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # READ — paginated by user with files
    # -------------------------
    @staticmethod
    def get_by_user(user_id: int, page: int = 1, limit: int = 10):
        try:
            page = max(page, 1)
            limit = min(max(limit, 1), 100)
            offset = (page - 1) * limit

            total_result = fetch_query(
                "SELECT COUNT(*) AS total FROM accomplishments WHERE user_id = %s",
                [user_id],
            )
            total = total_result[0]["total"] if total_result else 0
            total_pages = math.ceil(total / limit) if total else 0

            rows = fetch_query(
                "SELECT * FROM accomplishments WHERE user_id = %s ORDER BY created_at DESC LIMIT %s OFFSET %s",
                [user_id, limit, offset],
            )
            posts = [_serialize_row(dict(r)) for r in (rows or [])]
            _attach_files(posts)

            return {
                "statusCode": 200,
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "count": len(posts),
                "data": posts,
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # READ — paginated all posts with files
    # -------------------------
    @staticmethod
    def get_all(page: int = 1, limit: int = 10):
        try:
            page = max(page, 1)
            limit = min(max(limit, 1), 100)
            offset = (page - 1) * limit

            total_result = fetch_query("SELECT COUNT(*) AS total FROM accomplishments", [])
            total = total_result[0]["total"] if total_result else 0
            total_pages = math.ceil(total / limit) if total else 0

            rows = fetch_query(
                "SELECT * FROM accomplishments ORDER BY created_at DESC LIMIT %s OFFSET %s",
                [limit, offset],
            )
            posts = [_serialize_row(dict(r)) for r in (rows or [])]
            _attach_files(posts)

            return {
                "statusCode": 200,
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "count": len(posts),
                "data": posts,
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # UPDATE — only the owner can update
    # -------------------------
    @staticmethod
    def update(post_id: int, user_id: int, content: str):
        try:
            if not content or not content.strip():
                return {"statusCode": 400, "message": "Content cannot be empty"}

            rows = fetch_query(
                "SELECT id, user_id FROM accomplishments WHERE id = %s",
                [post_id],
            )
            if not rows:
                return {"statusCode": 404, "message": "Accomplishment not found"}
            if rows[0]["user_id"] != user_id:
                return {"statusCode": 403, "message": "Not authorized to edit this post"}

            result = query(
                "UPDATE accomplishments SET content = %s, updated_at = NOW() WHERE id = %s",
                [content.strip(), post_id],
            )
            if result["statusCode"] == 200:
                result["message"] = "Accomplishment updated successfully"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # DELETE — only the owner can delete (files cascade via FK)
    # -------------------------
    @staticmethod
    def delete(post_id: int, user_id: int):
        try:
            rows = fetch_query(
                "SELECT id, user_id FROM accomplishments WHERE id = %s",
                [post_id],
            )
            if not rows:
                return {"statusCode": 404, "message": "Accomplishment not found"}
            if rows[0]["user_id"] != user_id:
                return {"statusCode": 403, "message": "Not authorized to delete this post"}

            result = query("DELETE FROM accomplishments WHERE id = %s", [post_id])
            if result["statusCode"] == 200:
                result["message"] = "Accomplishment deleted successfully"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # FILES — add a file to a post
    # -------------------------
    @staticmethod
    def add_file(
        post_id: int,
        file_url: str,
        file_type: str,
        file_name: Optional[str] = None,
        file_size: Optional[int] = None,
    ):
        try:
            if file_type not in VALID_FILE_TYPES:
                return {
                    "statusCode": 400,
                    "message": f"Invalid file_type. Must be one of: {', '.join(VALID_FILE_TYPES)}",
                }

            post_check = fetch_query(
                "SELECT id FROM accomplishments WHERE id = %s", [post_id]
            )
            if not post_check:
                return {"statusCode": 404, "message": "Accomplishment not found"}

            conn = get_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO accomplishment_files (post_id, file_url, file_type, file_name, file_size)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        [post_id, file_url, file_type, file_name, file_size],
                    )
                    new_id = cursor.lastrowid
                conn.commit()
            finally:
                conn.close()

            return {
                "statusCode": 201,
                "message": "File added successfully",
                "id": new_id,
            }
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # FILES — get all files for a post
    # -------------------------
    @staticmethod
    def get_files(post_id: int):
        try:
            post_check = fetch_query(
                "SELECT id FROM accomplishments WHERE id = %s", [post_id]
            )
            if not post_check:
                return {"statusCode": 404, "message": "Accomplishment not found"}

            rows = fetch_query(
                "SELECT * FROM accomplishment_files WHERE post_id = %s ORDER BY created_at ASC",
                [post_id],
            )
            files = [_serialize_row(dict(r)) for r in (rows or [])]
            return {"statusCode": 200, "count": len(files), "data": files}
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}

    # -------------------------
    # FILES — delete a single file (ownership checked via post)
    # -------------------------
    @staticmethod
    def delete_file(file_id: int, post_id: int, user_id: int):
        try:
            file_rows = fetch_query(
                "SELECT f.id FROM accomplishment_files f "
                "JOIN accomplishments a ON a.id = f.post_id "
                "WHERE f.id = %s AND f.post_id = %s AND a.user_id = %s",
                [file_id, post_id, user_id],
            )
            if not file_rows:
                return {
                    "statusCode": 404,
                    "message": "File not found or not authorized",
                }

            result = query(
                "DELETE FROM accomplishment_files WHERE id = %s", [file_id]
            )
            if result["statusCode"] == 200:
                result["message"] = "File deleted successfully"
            return result
        except Exception as e:
            return {"statusCode": 500, "message": str(e)}
