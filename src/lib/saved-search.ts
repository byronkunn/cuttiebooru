interface SavedSearchCriteria {
  query: string;
  includedTags: string;
  excludedTags: string;
  mediaType: string;
  rating: string;
}

interface SearchablePost {
  title: string;
  description: string;
  mediaType: string;
  rating: string;
  category: string;
  creator: { username: string; displayName: string };
  tags: { tag: { name: string; displayName: string } }[];
}

export function savedSearchMatchesPost(
  search: SavedSearchCriteria,
  post: SearchablePost,
  allowExplicit: boolean
) {
  if (!allowExplicit && post.rating !== "sfw") return false;
  if (search.mediaType !== "all" && post.mediaType !== search.mediaType) {
    return false;
  }
  if (search.rating !== "all" && post.rating !== search.rating) return false;

  const tags = post.tags.map(({ tag }) => ({
    name: tag.name.toLowerCase(),
    displayName: tag.displayName.toLowerCase(),
  }));
  let includedTags: string[] = [];
  let excludedTags: string[] = [];
  try {
    const p = JSON.parse(search.includedTags || "[]");
    if (Array.isArray(p)) includedTags = p;
  } catch {}
  try {
    const p = JSON.parse(search.excludedTags || "[]");
    if (Array.isArray(p)) excludedTags = p;
  } catch {}

  if (
    includedTags.some(
      (included) => !tags.some((tag) => tag.name === included.toLowerCase())
    )
  ) {
    return false;
  }

  const searchableText = [
    post.title,
    post.description,
  ].map((value) => value.toLowerCase());

  const queryIncluded: string[] = [];
  const queryExcluded: string[] = [];
  for (const token of search.query.trim().split(/\s+/).filter(Boolean)) {
    const normalized = token.toLowerCase().replace(/^#/, "");
    if (token.startsWith("-") && token.length > 1) {
      queryExcluded.push(token.slice(1).toLowerCase().replace(/^#/, ""));
    } else {
      queryIncluded.push(normalized);
    }
  }

  const excludedTagMatches = (excluded: string) => {
    const normalized = excluded.toLowerCase();
    return (
      tags.some(
        (tag) =>
          tag.name.includes(normalized) ||
          tag.displayName.includes(normalized)
      ) ||
      post.title.toLowerCase().includes(normalized) ||
      post.rating.toLowerCase() === normalized
    );
  };
  if ([...excludedTags, ...queryExcluded].some(excludedTagMatches)) {
    return false;
  }

  const includedSearchableText = [
    ...searchableText,
    post.category,
    post.rating,
    post.creator.username,
    post.creator.displayName,
  ]
    .map((value) => value.toLowerCase())
    .concat(tags.flatMap((tag) => [tag.name, tag.displayName]));

  return queryIncluded.every((token) =>
    includedSearchableText.some((value) => value.includes(token))
  );
}
