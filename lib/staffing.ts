// Option lists for the "Join our team" form — mirrors the original WordPress signup form.

export const ROLES = ["Chef", "Cook", "Kitchen Hand", "Cleaner"] as const;

export const EXPERTISE = [
  "Australian",
  "Italian",
  "Asian",
  "Indian",
  "Greek",
  "Seafood",
  "BBQ/Grill",
  "Pastry/Desserts",
  "Bakery",
  "Salads/Larder",
  "Garde Manger",
  "Banquets/Events",
  "Barista",
  "Cocktails",
  "Functions",
  "Buffet",
];

export const QUALIFICATIONS = [
  "Cert III (Commercial Cookery)",
  "Cert IV (Supervision)",
  "Food Safety Supervisor",
  "Food Handling (Level 1)",
  "First Aid (HLTAID011)",
  "CPR (HLTAID009)",
  "RSA",
  "Working With Children Check",
  "National Police Check",
  "Driver Licence",
];

export const WORK_RIGHTS = [
  "Australian Citizen/PR (unrestricted)",
  "Temporary Visa (unrestricted)",
  "Student Visa (hourly cap)",
  "Working Holiday/Other (check conditions)",
];

export const EMPLOYMENT_TYPES = ["PAYG (TFN)", "ABN Contractor"];

export const SHIFT_TYPES = ["Casual", "Part-time", "Full-time", "Event/On-call"];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_PARTS = ["morning", "afternoon", "night"] as const;

export const APPLICATION_STATUSES = ["NEW", "REVIEWING", "INTERVIEW", "APPROVED", "REJECTED", "ARCHIVED"] as const;

// Upload limits (nginx client_max_body_size must exceed the total)
export const MAX_PHOTO = 5 * 1024 * 1024;
export const MAX_DOC = 8 * 1024 * 1024;
export const MAX_CERTS = 6;
export const MAX_TOTAL = 30 * 1024 * 1024;
