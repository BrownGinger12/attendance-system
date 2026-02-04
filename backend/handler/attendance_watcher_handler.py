# handler/attendance_watcher_handler.py
from datetime import datetime, date, time as dtime
import time
from model.attendance_records import AttendanceRecord

class AttendanceWatcher:
    def __init__(self, socketio, interval: int = 2, namespace='/attendance'):
        self.socketio = socketio
        self.interval = interval
        self.namespace = namespace
        self.last_checktime: datetime | None = None
        self.running = False

    def start(self):
        self.running = True
        self._loop()

    def get_today_attendance(self):
        today_start = datetime.combine(date.today(), dtime.min)
        return AttendanceRecord.get_after(today_start)

    def _loop(self):
        while self.running:
            try:
                # Initialize last_checktime to earliest record today
                if self.last_checktime is None:
                    rows = self.get_today_attendance()
                    if rows:
                        self.last_checktime = rows[-1]["CHECKTIME"]
                    time.sleep(self.interval)
                    continue

                # Get new records after last_checktime
                records = AttendanceRecord.get_after(self.last_checktime)

                for record in records:
                    self.last_checktime = record["CHECKTIME"]

                    # Convert CHECKTIME to string for JSON
                    if isinstance(record.get("CHECKTIME"), datetime):
                        record["CHECKTIME"] = record["CHECKTIME"].isoformat()

                    # Emit to client
                    self.socketio.emit(
                        'new_attendance',
                        record,
                        namespace=self.namespace
                    )

            except Exception as e:
                print("Attendance watcher error:", e)

            time.sleep(self.interval)
