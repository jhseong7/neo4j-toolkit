import { Neo4jPrimitive, Neo4jProperties } from "../types";
import { ParameterizedQuery } from "./type";

/**
 * Convert some of the primitive values to string
 *
 * for example, function calls in the query e.g.) time('2021-01-01') must be written directly in the query
 * @param value
 * @returns
 */
function _convertValue(value: Neo4jPrimitive): string {
  if (typeof value === "function") {
    return value();
  }

  return JSON.stringify(value);
}

export function replaceQueryParameters(
  query: string,
  parameters: ParameterizedQuery["parameters"]
) {
  let replacedQuery = query;
  for (const [key, value] of Object.entries(parameters)) {
    replacedQuery = replacedQuery.replace(
      new RegExp(`\\$${key}`, "g"),
      _convertValue(value)
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
