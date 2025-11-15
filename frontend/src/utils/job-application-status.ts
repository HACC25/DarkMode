import type { JobApplicationStatusEnum } from "@/client"

export const jobApplicationStatusLabels: Record<JobApplicationStatusEnum, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

export const jobApplicationStatusPalette: Record<JobApplicationStatusEnum, string> = {
  SUBMITTED: "blue",
  UNDER_REVIEW: "orange",
  INTERVIEW: "purple",
  ACCEPTED: "green",
  REJECTED: "red",
  WITHDRAWN: "gray",
}

export const jobApplicationStatusOrder: JobApplicationStatusEnum[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
]
