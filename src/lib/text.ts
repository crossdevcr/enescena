export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parseGenres(input: string) {
  return input
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}