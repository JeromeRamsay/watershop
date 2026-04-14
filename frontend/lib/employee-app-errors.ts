export const EMPLOYEE_APP_ERROR_EVENT = "watershop:employee-app-error";

export interface EmployeeAppErrorDetail {
  message: string;
  source?: string;
  requestId?: string;
}

export const emitEmployeeAppError = (detail: EmployeeAppErrorDetail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<EmployeeAppErrorDetail>(EMPLOYEE_APP_ERROR_EVENT, {
      detail,
    }),
  );
};