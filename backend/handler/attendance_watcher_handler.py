# handler/attendance_watcher.py

from datetime import datetime, time as dt_time
import time
from model.attendance_records import AttendanceRecord


class AttendanceWatcher:
    def __init__(self, socketio, namespace="/attendance", interval: int = 2):
        self.socketio = socketio
        self.namespace = namespace
        self.interval = interval
        self.last_checktime: datetime | None = None
        self.running = False

    def start(self):
        self.running = True
        self._loop()

    def _loop(self):
        while self.running:
            try:
                # Set last_checktime to today at 00:00 if not initialized
                if self.last_checktime is None:
                    now = datetime.now()
                    self.last_checktime = datetime.combine(now.date(), dt_time(0, 0, 0))

                # Get new records for today after last_checktime
                records = AttendanceRecord.get_after_today(self.last_checktime)

                for record in records:
                    # Update last_checktime to the latest record
                    self.last_checktime = record["CHECKTIME"]

                    # Emit the new attendance record to the websocket
                    self.socketio.emit(
                        "attendance:new",
                        record,
                        namespace=self.namespace
                    )

            except Exception as e:
                print("Attendance watcher error:", e)

            time.sleep(self.interval)
