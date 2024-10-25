import { Neo4jProperties } from "../types";
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

export function mergeProperties(
  properties: Neo4jProperties,
  newProperties: Neo4jProperties
) {
  Object.entries(newProperties).forEach(([key, value]) => {
    properties[key] = value;
  });
}
