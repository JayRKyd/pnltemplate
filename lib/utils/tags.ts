// Validate tags format (must start with #)
export function validateTags(tagsInput: string): { 
  valid: boolean; 
  tags: string[]; 
  errors: string[] 
} {
  const errors: string[] = [];
  const validTags: string[] = [];

  if (!tagsInput.trim()) {
    return { valid: true, tags: [], errors: [] };
  }

  // Split by comma or space
  const rawTags = tagsInput
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  for (const tag of rawTags) {
    // Add # if not present
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
    
    // Validate tag format
    if (normalizedTag.length < 2) {
      errors.push(`Tag "${tag}" is too short`);
    } else if (!/^#[a-zA-Z0-9_-]+$/.test(normalizedTag)) {
      errors.push(`Tag "${tag}" contains invalid characters`);
    } else {
      validTags.push(normalizedTag.toLowerCase());
    }
  }

  return {
    valid: errors.length === 0,
    tags: [...new Set(validTags)], // Remove duplicates
    errors,
  };
}
