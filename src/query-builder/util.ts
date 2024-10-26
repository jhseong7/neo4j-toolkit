import { Neo4jPrimitive, Neo4jProperties } from "../types";
import { ParameterizedQuery } from "./type";
import { v4 } from "uuid";

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
  newProperties: Neo4jProperties | undefined
) {
  if (!newProperties) {
    return;
  }

  Object.entries(newProperties).forEach(([key, value]) => {
    properties[key] = value;
  });
}

/**
 * Extract the aliases from the statement
 * @param statement
 * @returns
 */
export function extractAliases(statement: string) {
  const resultSet = new Set<string>();

  // Format of n.name = $name, extract n
  const dotMatched = statement.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\./g);

  if (dotMatched) {
    const dotAliases = dotMatched.map((match) => match.replace(".", ""));
    for (const alias of dotAliases) {
      resultSet.add(alias);
    }
  }

  // extract from bracketed aliases
  const bracketNotationRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\[[^\]]+\]/g;

  let match: RegExpExecArray | null;
  while ((match = bracketNotationRegex.exec(statement)) !== null) {
    // Add the group 1 to the resultSet (first group is the full match)
    resultSet.add(match[1]);
  }

  return Array.from(resultSet);
}

/**
 * Randomize the key to prevent key collision for the parameters for each statement
 * @param key
 * @returns
 */
export function randomizeKey(key: string): string {
  // Add a randomKey to the end of the key
  return `${key}_${v4().replace(/-/g, "").substring(0, 10)}`;
}

/**
 * Randomize the key of the parameter to prevent key collision
 *
 * @param statement
 * @param parameters
 * @returns
 */
export function randomizeParameterKeys(
  statement: string,
  parameters: undefined
): { statement: string; parameters: undefined };
export function randomizeParameterKeys(
  statement: string,
  parameters: Neo4jProperties
): { statement: string; parameters: Neo4jProperties };
export function randomizeParameterKeys(
  statement: string,
  parameters?: Neo4jProperties
) {
  if (!parameters) {
    return {
      statement,
      parameters,
    };
  }

  // extract all the keys from the statement
  const keys = statement.match(/\$[a-zA-Z0-9]+/g);
  if (!keys) {
    return {
      statement,
      parameters,
    };
  }

  let newStatement = "";
  let newParameters: Neo4jProperties = {};

  for (const key of keys) {
    const newKey = randomizeKey(key);
    newStatement = statement.replace(key, newKey);
    newParameters[newKey.substring(1)] = parameters[key.substring(1)]; // Drop the $ from the key
  }

  return {
    statement: newStatement,
    parameters: newParameters,
  };
}
