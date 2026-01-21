# handler/attendance_watcher.py

from datetime import datetime, date, time as dtime
import time
from model.attendance_records import AttendanceRecord


class AttendanceWatcher:
    def __init__(self, socketio, namespace: str = "/attendance", interval: int = 2):
        """
        :param socketio: Flask-SocketIO instance
        :param namespace: The socket.io namespace to emit events to
        :param interval: Time in seconds between checks
        """
        self.socketio = socketio
        self.namespace = namespace
        self.interval = interval
        self.last_checktime: datetime | None = None
        self.running = False
    
    def start(self):
        """Start the watcher loop"""
        self.running = True
        self._loop()

    def _loop(self):
        while self.running:
            try:
                # Initialize last_checktime to earliest record today
                if self.last_checktime is None:
                    today_start = datetime.combine(date.today(), dtime.min)
                    rows = AttendanceRecord.get_after(today_start)
                    if rows:
                        self.last_checktime = rows[-1]["CHECKTIME"]
                    time.sleep(self.interval)
                    continue

                # Get new records after last_checktime
                records = AttendanceRecord.get_after(self.last_checktime)

                for record in records:
                    self.last_checktime = record["CHECKTIME"]

                    # 🔥 Emit to client
                    self.socketio.emit(
                        'new_attendance',  # event name
                        record,            # data
                        namespace=self.namespace
                    )

            except Exception as e:
                print("Attendance watcher error:", e)

            time.sleep(self.interval)
