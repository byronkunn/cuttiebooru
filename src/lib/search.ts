export function parseSearchInput(
  input: string,
  included: string[] = [],
  excluded: string[] = [],
) {
  let includedTags = [...included];
  let excludedTags = [...excluded];
  const keywords: string[] = [];
  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    const match = token.match(/^(-?)#([^#]+)$/);
    if (!match) {
      keywords.push(token);
      continue;
    }
    const tag = match[2].toLowerCase();
    includedTags = includedTags.filter((name) => name !== tag);
    excludedTags = excludedTags.filter((name) => name !== tag);
    if (match[1]) excludedTags.push(tag);
    else includedTags.push(tag);
  }
  return { query: keywords.join(" "), includedTags, excludedTags };
}
