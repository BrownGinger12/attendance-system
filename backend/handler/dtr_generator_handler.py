# dtr_generator.py
from docx import Document
from docx.shared import Pt
from datetime import datetime, date, timedelta
import calendar
from gateway.mysql_gateway import fetch_query


def get_attendance_from_db(userid, month):
    """Fetch attendance records from MySQL for a given user and month"""
    start = datetime.strptime(month + "-01", "%Y-%m-%d")
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)

    sql = """
        SELECT userid, checktime, checktype
        FROM attendance
        WHERE userid = %s AND checktime >= %s AND checktime < %s
        ORDER BY checktime ASC
    """
    rows = fetch_query(sql, [userid, start, end])
    return {"name": "", "data": rows}


def parse_datetime_flexible(dt_value):
    """Helper to parse various datetime formats"""
    if isinstance(dt_value, datetime):
        return dt_value
    
    # Try different datetime formats
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%a, %d %b %Y %H:%M:%S GMT',  # GMT format from API
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S.%fZ',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(dt_value, fmt)
        except ValueError:
            continue
    
    # If none of the formats work, raise an error with helpful message
    raise ValueError(f"Unable to parse datetime: {dt_value}")


def parse_attendance_data(json_data):
    """Parse attendance records into structured AM/PM IN/OUT"""
    sorted_records = sorted(
        json_data['data'],
        key=lambda x: parse_datetime_flexible(x['checktime'])
    )

    attendance = {}
    for record in sorted_records:
        dt = parse_datetime_flexible(record['checktime'])
        date_key = dt.date()
        if date_key not in attendance:
            attendance[date_key] = {'in': [], 'out': []}

        time_str = dt.strftime('%H:%M')
        hour = dt.hour

        if record['checktype'] == 'I':
            attendance[date_key]['in'].append((time_str, hour))
        else:
            attendance[date_key]['out'].append((time_str, hour))

    # Classify AM/PM
    classified = {}
    for date_key, records in attendance.items():
        classified[date_key] = {'in': [], 'out': []}

        am_ins = [(t,h) for t,h in records['in'] if h < 12]
        pm_ins = [(t,h) for t,h in records['in'] if h >= 12]
        am_outs = [(t,h) for t,h in records['out'] if h < 13]
        pm_outs = [(t,h) for t,h in records['out'] if h >= 13]

        # IN
        if am_ins:
            classified[date_key]['in'].append(am_ins[0][0])
        if pm_ins:
            if not am_ins:
                classified[date_key]['in'].append('')
            classified[date_key]['in'].append(pm_ins[0][0])

        # OUT
        if am_outs:
            classified[date_key]['out'].append(am_outs[0][0])
        if pm_outs:
            if not am_outs:
                classified[date_key]['out'].append('')
            classified[date_key]['out'].append(pm_outs[0][0])

    return classified


def get_month_weekends(year, month):
    """Return all weekends in the month as {day: 'SAT'/'SUN'}"""
    weekends = {}
    cal = calendar.monthcalendar(year, month)
    for week in cal:
        if week[calendar.SATURDAY] != 0:
            weekends[week[calendar.SATURDAY]] = 'SAT'
        if week[calendar.SUNDAY] != 0:
            weekends[week[calendar.SUNDAY]] = 'SUN'
    return weekends


def calculate_undertime(record, expected_am_hours=4, expected_pm_hours=4):
    """Calculate undertime for AM/PM"""
    total_minutes = 0
    # AM
    if record['in'] and record['out']:
        try:
            am_in = datetime.strptime(record['in'][0], '%H:%M')
            am_out = datetime.strptime(record['out'][0], '%H:%M')
            am_worked = (am_out - am_in).total_seconds() / 60
            am_undertime = max(0, expected_am_hours*60 - am_worked)
            total_minutes += am_undertime
        except:
            pass
    # PM
    if len(record['in']) > 1 and len(record['out']) > 1:
        try:
            pm_in = datetime.strptime(record['in'][1], '%H:%M')
            pm_out = datetime.strptime(record['out'][1], '%H:%M')
            pm_worked = (pm_out - pm_in).total_seconds() / 60
            pm_undertime = max(0, expected_pm_hours*60 - pm_worked)
            total_minutes += pm_undertime
        except:
            pass

    hours = int(total_minutes // 60)
    minutes = int(total_minutes % 60)
    return hours, minutes


def fill_dtr_document_from_data(template_path, json_data, employee_name=''):
    """
    Fill DTR DOCX template using provided attendance data (no database fetch)
    json_data should be: {"name": "...", "data": [attendance records]}
    """
    doc = Document(template_path)
    json_data['name'] = employee_name

    attendance = parse_attendance_data(json_data)

    # Determine year/month names
    if json_data['data']:
        first_dt = parse_datetime_flexible(json_data['data'][0]['checktime'])
        year, month_num = first_dt.year, first_dt.month
    else:
        now = datetime.now()
        year, month_num = now.year, now.month
    month_name = datetime(year, month_num, 1).strftime('%B %Y')

    weekends = get_month_weekends(year, month_num)
    employee_name = employee_name.upper()

    # Total undertime
    total_hours = total_minutes = 0
    for date_obj, record in attendance.items():
        uh, um = calculate_undertime(record)
        total_hours += uh
        total_minutes += um
    total_hours += total_minutes // 60
    total_minutes = total_minutes % 60

    # Fill paragraphs
    for paragraph in doc.paragraphs:
        paragraph.text = paragraph.text.replace('[name]', employee_name)\
                                       .replace('[month]', month_name)\
                                       .replace('[toth]', str(total_hours))\
                                       .replace('[totm]', str(total_minutes))

    # Fill tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                text = cell.text
                for day in range(1, 32):
                    try:
                        date_obj = datetime(year, month_num, day).date()
                    except ValueError:
                        continue

                    is_weekend = day in weekends
                    weekend_label = weekends.get(day, '')

                    placeholders = {
                        f'[aa{day}]': '', f'[da{day}]': '', f'[ap{day}]': '', f'[dp{day}]': '',
                        f'[uh{day}]': '', f'[m{day}]': ''
                    }

                    if is_weekend:
                        placeholders[f'[aa{day}]'] = weekend_label
                    elif date_obj in attendance:
                        record = attendance[date_obj]
                        placeholders[f'[aa{day}]'] = record['in'][0] if record['in'] else ''
                        placeholders[f'[da{day}]'] = record['out'][0] if record['out'] else ''
                        placeholders[f'[ap{day}]'] = record['in'][1] if len(record['in']) > 1 else ''
                        placeholders[f'[dp{day}]'] = record['out'][1] if len(record['out']) > 1 else ''
                        uh, um = calculate_undertime(record)
                        placeholders[f'[uh{day}]'] = str(uh) if uh > 0 else ''
                        placeholders[f'[m{day}]'] = str(um) if um > 0 else ''

                    for ph, val in placeholders.items():
                        text = text.replace(ph, val)

                cell.text = text
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.size = Pt(6)

    return doc, employee_name, month_name, len(attendance)


def fill_dtr_document(template_path, userid, month, employee_name=''):
    """
    Fill DTR DOCX template for a specific user and month
    """
    doc = Document(template_path)
    json_data = get_attendance_from_db(userid, month)
    json_data['name'] = employee_name

    attendance = parse_attendance_data(json_data)

    # Determine year/month names
    if json_data['data']:
        first_dt = parse_datetime_flexible(json_data['data'][0]['checktime'])
        year, month_num = first_dt.year, first_dt.month
    else:
        now = datetime.now()
        year, month_num = now.year, now.month
    month_name = datetime(year, month_num, 1).strftime('%B %Y')

    weekends = get_month_weekends(year, month_num)
    employee_name = employee_name.upper()

    # Total undertime
    total_hours = total_minutes = 0
    for date_obj, record in attendance.items():
        uh, um = calculate_undertime(record)
        total_hours += uh
        total_minutes += um
    total_hours += total_minutes // 60
    total_minutes = total_minutes % 60

    # Fill paragraphs
    for paragraph in doc.paragraphs:
        paragraph.text = paragraph.text.replace('[name]', employee_name)\
                                       .replace('[month]', month_name)\
                                       .replace('[toth]', str(total_hours))\
                                       .replace('[totm]', str(total_minutes))

    # Fill tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                text = cell.text
                for day in range(1, 32):
                    try:
                        date_obj = datetime(year, month_num, day).date()
                    except ValueError:
                        continue

                    is_weekend = day in weekends
                    weekend_label = weekends.get(day, '')

                    placeholders = {
                        f'[aa{day}]': '', f'[da{day}]': '', f'[ap{day}]': '', f'[dp{day}]': '',
                        f'[uh{day}]': '', f'[m{day}]': ''
                    }

                    if is_weekend:
                        placeholders[f'[aa{day}]'] = weekend_label
                    elif date_obj in attendance:
                        record = attendance[date_obj]
                        placeholders[f'[aa{day}]'] = record['in'][0] if record['in'] else ''
                        placeholders[f'[da{day}]'] = record['out'][0] if record['out'] else ''
                        placeholders[f'[ap{day}]'] = record['in'][1] if len(record['in']) > 1 else ''
                        placeholders[f'[dp{day}]'] = record['out'][1] if len(record['out']) > 1 else ''
                        uh, um = calculate_undertime(record)
                        placeholders[f'[uh{day}]'] = str(uh) if uh > 0 else ''
                        placeholders[f'[m{day}]'] = str(um) if um > 0 else ''

                    for ph, val in placeholders.items():
                        text = text.replace(ph, val)

                cell.text = text
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.size = Pt(6)

    return doc, employee_name, month_name, len(attendance)