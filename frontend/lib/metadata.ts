import type { Metadata } from "next";

export const employeeAppName = "Woodstocks Watershop";
export const employeeAppDescription =
  "Woodstocks Watershop employee app for point-of-sale, customer management, deliveries, reporting, and day-to-day store operations.";

export const employeeAppMetadata: Metadata = {
  title: {
    default: employeeAppName,
    template: `${employeeAppName} - %s`,
  },
  description: employeeAppDescription,
};

export function buildPageMetadata(
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
  };
}