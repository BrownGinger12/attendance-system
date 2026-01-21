from docx import Document
from docx.shared import Pt
from datetime import datetime
import calendar

def parse_attendance_data(json_data):
    """Parse the JSON attendance data into a structured format with time-based AM/PM classification"""
    sorted_records = sorted(json_data['data'], 
                          key=lambda x: datetime.strptime(x['CHECKTIME'], '%a, %d %b %Y %H:%M:%S GMT'))
    
    attendance = {}
    
    for record in sorted_records:
        dt = datetime.strptime(record['CHECKTIME'], '%a, %d %b %Y %H:%M:%S GMT')
        date_key = dt.date()
        
        if date_key not in attendance:
            attendance[date_key] = {'in': [], 'out': []}
        
        time_str = dt.strftime('%H:%M')
        hour = dt.hour
        
        if record['CHECKTYPE'] == 'I':
            attendance[date_key]['in'].append((time_str, hour))
        else:
            attendance[date_key]['out'].append((time_str, hour))
    
    # Now classify IN/OUT into AM/PM based on time rules
    classified_attendance = {}
    
    for date_key, records in attendance.items():
        classified_attendance[date_key] = {'in': [], 'out': []}
        
        # Process IN records: if hour < 12, it's AM IN; otherwise PM IN
        am_ins = [(time, hour) for time, hour in records['in'] if hour < 12]
        pm_ins = [(time, hour) for time, hour in records['in'] if hour >= 12]
        
        # Process OUT records: if hour < 13 (1 PM), it's AM OUT; if hour >= 13, it's PM OUT
        am_outs = [(time, hour) for time, hour in records['out'] if hour < 13]
        pm_outs = [(time, hour) for time, hour in records['out'] if hour >= 13]
        
        # Build final arrays: [AM_IN, PM_IN] and [AM_OUT, PM_OUT]
        # Take the first AM IN and first PM IN
        if am_ins:
            classified_attendance[date_key]['in'].append(am_ins[0][0])
        if pm_ins:
            # Ensure PM IN is added as second element
            if not am_ins:
                classified_attendance[date_key]['in'].append('')  # Empty AM IN
            classified_attendance[date_key]['in'].append(pm_ins[0][0])
        
        # Take the first AM OUT and first PM OUT
        if am_outs:
            classified_attendance[date_key]['out'].append(am_outs[0][0])
        if pm_outs:
            # Ensure PM OUT is added as second element
            if not am_outs:
                classified_attendance[date_key]['out'].append('')  # Empty AM OUT
            classified_attendance[date_key]['out'].append(pm_outs[0][0])
    
    return classified_attendance

def get_month_weekends(year, month):
    """Get all Saturday and Sunday dates for a given month with their day names"""
    weekends = {}
    cal = calendar.monthcalendar(year, month)
    
    for week in cal:
        if week[calendar.SATURDAY] != 0:
            weekends[week[calendar.SATURDAY]] = 'SAT'
        if week[calendar.SUNDAY] != 0:
            weekends[week[calendar.SUNDAY]] = 'SUN'
    
    return weekends

def calculate_undertime(attendance_record, expected_am_hours=4, expected_pm_hours=4):
    """
    Calculate undertime based on actual work hours vs expected hours
    AM: Expected 4 hours (08:00-12:00)
    PM: Expected 4 hours (13:00-17:00)
    Returns tuple: (undertime_hours, undertime_minutes)
    """
    total_undertime_minutes = 0
    
    # Calculate AM work hours (if both AM in and AM out exist)
    if attendance_record['in'] and attendance_record['out']:
        try:
            am_in = datetime.strptime(attendance_record['in'][0], '%H:%M')
            am_out = datetime.strptime(attendance_record['out'][0], '%H:%M')
            am_worked = (am_out - am_in).total_seconds() / 60
            am_expected = expected_am_hours * 60
            am_undertime = max(0, am_expected - am_worked)
            total_undertime_minutes += am_undertime
        except (IndexError, ValueError, TypeError):
            pass
    
    # Calculate PM work hours (if both PM in and PM out exist)
    if len(attendance_record['in']) > 1 and len(attendance_record['out']) > 1:
        try:
            pm_in = datetime.strptime(attendance_record['in'][1], '%H:%M')
            pm_out = datetime.strptime(attendance_record['out'][1], '%H:%M')
            pm_worked = (pm_out - pm_in).total_seconds() / 60
            pm_expected = expected_pm_hours * 60
            pm_undertime = max(0, pm_expected - pm_worked)
            total_undertime_minutes += pm_undertime
        except (IndexError, ValueError, TypeError):
            pass
    
    undertime_hours = int(total_undertime_minutes // 60)
    undertime_minutes = int(total_undertime_minutes % 60)
    
    return undertime_hours, undertime_minutes

def fill_dtr_document(template_path, json_data):
    """
    Fill the DTR document with attendance data using placeholders
    
    Args:
        template_path (str): Path to the template DOCX file
        json_data (dict): JSON data containing 'name' and 'data' fields
        
    Returns:
        tuple: (Document object, employee_name, month_name, attendance_days)
    """
    doc = Document(template_path)
    
    attendance = parse_attendance_data(json_data)
    
    if json_data['data']:
        first_date = datetime.strptime(json_data['data'][0]['CHECKTIME'], 
                                      '%a, %d %b %Y %H:%M:%S GMT')
        month = first_date.month
        year = first_date.year
        month_name = first_date.strftime('%B %Y')
    else:
        now = datetime.now()
        month = now.month
        year = now.year
        month_name = now.strftime('%B %Y')
    
    weekends = get_month_weekends(year, month)
    employee_name = json_data['name'].upper()
    
    # Calculate total undertime
    total_undertime_hours = 0
    total_undertime_minutes = 0
    
    for date_obj, record in attendance.items():
        uh, um = calculate_undertime(record)
        total_undertime_hours += uh
        total_undertime_minutes += um
    
    total_undertime_hours += total_undertime_minutes // 60
    total_undertime_minutes = total_undertime_minutes % 60
    
    # Process all paragraphs
    for paragraph in doc.paragraphs:
        if '[name]' in paragraph.text:
            paragraph.text = paragraph.text.replace('[name]', employee_name)
        if '[month]' in paragraph.text:
            paragraph.text = paragraph.text.replace('[month]', month_name)
        if '[toth]' in paragraph.text:
            paragraph.text = paragraph.text.replace('[toth]', str(total_undertime_hours))
        if '[totm]' in paragraph.text:
            paragraph.text = paragraph.text.replace('[totm]', str(total_undertime_minutes))
    
    # Process all tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                text = cell.text
                
                if '[name]' in text:
                    text = text.replace('[name]', employee_name)
                if '[month]' in text:
                    text = text.replace('[month]', month_name)
                if '[toth]' in text:
                    text = text.replace('[toth]', str(total_undertime_hours))
                if '[totm]' in text:
                    text = text.replace('[totm]', str(total_undertime_minutes))
                
                # Process attendance placeholders
                for day in range(1, 32):
                    date_obj = None
                    try:
                        date_obj = datetime(year, month, day).date()
                    except ValueError:
                        continue
                    
                    is_weekend = day in weekends
                    weekend_label = weekends.get(day, '')
                    
                    aa_placeholder = f'[aa{day}]'  # AM Arrival
                    da_placeholder = f'[da{day}]'  # AM Departure
                    ap_placeholder = f'[ap{day}]'  # PM Arrival
                    dp_placeholder = f'[dp{day}]'  # PM Departure
                    uh_placeholder = f'[uh{day}]'  # Undertime Hours
                    m_placeholder = f'[m{day}]'    # Undertime Minutes
                    
                    if any(p in text for p in [aa_placeholder, da_placeholder, ap_placeholder, 
                                               dp_placeholder, uh_placeholder, m_placeholder]):
                        
                        if is_weekend:
                            text = text.replace(aa_placeholder, weekend_label)
                            text = text.replace(da_placeholder, '')
                            text = text.replace(ap_placeholder, '')
                            text = text.replace(dp_placeholder, '')
                            text = text.replace(uh_placeholder, '')
                            text = text.replace(m_placeholder, '')
                        elif date_obj in attendance:
                            record = attendance[date_obj]
                            
                            # AM Arrival - first IN
                            if aa_placeholder in text:
                                value = record['in'][0] if record['in'] else ''
                                text = text.replace(aa_placeholder, value)
                            
                            # AM Departure - first OUT
                            if da_placeholder in text:
                                value = record['out'][0] if record['out'] else ''
                                text = text.replace(da_placeholder, value)
                            
                            # PM Arrival - second IN
                            if ap_placeholder in text:
                                value = record['in'][1] if len(record['in']) > 1 else ''
                                text = text.replace(ap_placeholder, value)
                            
                            # PM Departure - second OUT
                            if dp_placeholder in text:
                                value = record['out'][1] if len(record['out']) > 1 else ''
                                text = text.replace(dp_placeholder, value)
                            
                            uh, um = calculate_undertime(record)
                            text = text.replace(uh_placeholder, str(uh) if uh > 0 else '')
                            text = text.replace(m_placeholder, str(um) if um > 0 else '')
                        else:
                            text = text.replace(aa_placeholder, '')
                            text = text.replace(da_placeholder, '')
                            text = text.replace(ap_placeholder, '')
                            text = text.replace(dp_placeholder, '')
                            text = text.replace(uh_placeholder, '')
                            text = text.replace(m_placeholder, '')
                
                cell.text = text
                
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.size = Pt(6)
    
    return doc, employee_name, month_name, len(attendance)