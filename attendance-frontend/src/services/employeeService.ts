import apiClient from "../client/axiosClient";

export interface Employee {
  USERID: number;
  Name: string;
  Badgenumber: string;
  DEFAULTDEPTID: number;
  // Add other fields as needed
}

export interface Department {
  DEPTID: number;
  DEPTNAME: string;
  SUPDEPTID: number;
  // Add other fields as needed
}

export interface AttendanceRecord {
  CHECKTIME: string;
  CHECKTYPE: string;
  USERID: number;
  SENSORID: string;
  VERIFYCODE: number;
  WorkCode: string;
  sn: string;
  Memoinfo: string | null;
  UserExtFmt: number;
}

export interface EmployeeDetail {
  USERID: number;
  Name: string;
  Badgenumber: string;
  DEFAULTDEPTID: number;
  PHOTO: string | null;
  ATT: number;
  AccGroup: number;
  AutoSchPlan: number;
  BIRTHDAY: string | null;
  CITY: string | null;
  CardNo: string;
  EMPRIVILEGE: number;
  Expires: number;
  FPHONE: string | null;
  FaceGroup: number;
  Gender: string | null;
  HIREDDAY: string | null;
  HOLIDAY: number;
  INLATE: number;
  InheritDeptRule: number;
  InheritDeptSch: number;
  InheritDeptSchClass: number;
  LUNCHDURATION: number;
  MINZU: string | null;
  MinAutoSchInterval: number;
  Notes: string | null;
  OPHONE: string | null;
  OUTEARLY: number;
  OVERTIME: number;
  PAGER: string | null;
  PASSWORD: string | null;
  Pin1: string | null;
  RegisterOT: number;
  SECURITYFLAGS: string | null;
  SEP: number;
  SSN: string | null;
  STATE: string | null;
  TITLE: string | null;
  TimeZone1: number;
  TimeZone2: number;
  TimeZone3: number;
  UseAccGroupTZ: number;
  VERIFICATIONMETHOD: string | null;
  ValidCount: number;
  ValidTimeBegin: string | null;
  ValidTimeEnd: string | null;
  VerifyCode: number;
  ZIP: string | null;
  mverifypass: string | null;
  privilege: number;
  street: string | null;
}

export interface EmployeesResponse {
  statusCode: number;
  data: Employee[];
  page: number;
  limit: number;
  total_employees: number;
  total_pages: number;
  count: number;
}

export interface EmployeePagesResponse {
  statusCode: number;
  total_employees: number;
  total_pages: number;
  limit: number;
}

export interface DepartmentsResponse {
  statusCode: number;
  data: Department[];
  count: number;
}

export interface AttendanceResponse {
  statusCode: number;
  data: AttendanceRecord[];
  count: number;
}

export interface EmployeeDetailResponse {
  statusCode: number;
  data: EmployeeDetail;
}

export const employeeService = {
  // Get employees with pagination
  getEmployees: async (
    page: number = 1,
    limit: number = 10,
  ): Promise<EmployeesResponse> => {
    const response = await apiClient.get<EmployeesResponse>("/employees", {
      params: { page, limit },
    });
    return response.data;
  },

  // Get total pages info
  getEmployeePages: async (
    limit: number = 10,
  ): Promise<EmployeePagesResponse> => {
    const response = await apiClient.get<EmployeePagesResponse>(
      "/employees/pages",
      {
        params: { limit },
      },
    );
    return response.data;
  },

  // Get all departments
  getDepartments: async (): Promise<DepartmentsResponse> => {
    const response = await apiClient.get<DepartmentsResponse>("/departments");
    return response.data;
  },

  // Get all attendance records
  getAllAttendance: async (): Promise<AttendanceResponse> => {
    const response = await apiClient.get<AttendanceResponse>("/attendance");
    return response.data;
  },

  // Get attendance by month
  getAttendanceByMonth: async (
    yearMonth: string,
  ): Promise<AttendanceResponse> => {
    const response = await apiClient.get<AttendanceResponse>(
      "/attendance/month",
      {
        params: { month: yearMonth },
      },
    );
    return response.data;
  },

  // Get attendance by day
  getAttendanceByDay: async (date: string): Promise<AttendanceResponse> => {
    const response = await apiClient.get<AttendanceResponse>(
      "/attendance/day",
      {
        params: { day: date },
      },
    );
    return response.data;
  },

  // Get employee by ID
  getEmployeeById: async (userId: number): Promise<EmployeeDetailResponse> => {
    const response = await apiClient.get<EmployeeDetailResponse>(
      `/employee/${userId}`,
    );
    return response.data;
  },

  // Update employee
  updateEmployee: async (
    userId: number,
    payload: any,
  ): Promise<EmployeeDetailResponse> => {
    const response = await apiClient.put<EmployeeDetailResponse>(
      `/employee/${userId}`,
      payload,
    );
    return response.data;
  },
};

export default employeeService;
