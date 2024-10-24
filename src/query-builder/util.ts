import { ParameterizedQuery } from "./type";

export function replaceQueryParameters(
  query: string,
  parameters: ParameterizedQuery["parameters"]
) {
  let replacedQuery = query;
  for (const [key, value] of Object.entries(parameters)) {
    replacedQuery = replacedQuery.replace(
      new RegExp(`\\$${key}`, "g"),
      JSON.stringify(value)
    );
  }

  return replacedQuery;
}
