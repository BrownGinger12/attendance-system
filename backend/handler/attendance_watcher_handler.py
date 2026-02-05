# handler/attendance_watcher_handler.py
from datetime import datetime, date, time as dtime
from model.attendance_records import AttendanceRecord

class AttendanceWatcher:
    """
    Attendance watcher compatible with app.py structure.
    No polling: records should be pushed via emit_new_record().
    """

    def __init__(self, socketio, interval: int = 2, namespace='/attendance'):
        self.socketio = socketio
        self.interval = interval  # kept for compatibility
        self.namespace = namespace
        self.last_checktime: datetime | None = None
        self.running = False

    def start(self):
        """
        Placeholder for compatibility.
        In original code, this started a poll loop.
        Here, we just mark the watcher as running.
        """
        self.running = True
        print("AttendanceWatcher ready. Use emit_new_record() to push data.")

    def get_today_attendance(self):
        """
        Return today's attendance records from SQL (used on WebSocket connect).
        """
        today_start = datetime.combine(date.today(), dtime.min)
        return AttendanceRecord.get_after(today_start)

    def emit_new_record(self, record: dict):
        """
        Push a single new attendance record to clients.
        """
        if isinstance(record.get("checktime"), datetime):
            record["checktime"] = record["checktime"].isoformat()

        self.socketio.emit(
            'new_attendance',
            record,
            namespace=self.namespace
        )

    def emit_bulk_records(self, records: list[dict]):
        """
        Push multiple records at once.
        """
        for record in records:
            self.emit_new_record(record)

    def _loop(self):
        """
        Placeholder to preserve structure.
        No polling is done here.
        """
        print("AttendanceWatcher _loop() called (no polling).")
