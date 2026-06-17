export const EDUCATION_LEVEL_OPTIONS = [
  { label: "Less than high school", value: "less_than_high_school" },
  { label: "High school / GED", value: "high_school_ged" },
  { label: "Some college", value: "some_college" },
  { label: "Associate degree", value: "associate_degree" },
  { label: "Bachelor's degree", value: "bachelor_degree" },
  { label: "Master's degree", value: "master_degree" },
  { label: "Doctorate or professional degree", value: "doctorate_professional" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

export function getEducationLevelLabel(value) {
  if (!value) return "";
  const match = EDUCATION_LEVEL_OPTIONS.find((opt) => opt.value === value);
  return match?.label || "";
}

export function formatUserEducation(user) {
  if (!user) return "—";
  if (user.educationDisplay) return user.educationDisplay;
  if (user.highestEducationLevel) return getEducationLevelLabel(user.highestEducationLevel);
  if (user.yearsOfEducation != null && user.yearsOfEducation !== "") {
    return `${user.yearsOfEducation} years of education`;
  }
  return "—";
}
