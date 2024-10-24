import type { Neo4jPrimitive, Neo4jProperties } from "@/types";

import { QueryBuilderException } from "./exception";
import type { IQueryBuilder, ParameterizedQuery } from "./type";
import { replaceQueryParameters } from "./util";

type NodeMatchBuilderContructor = {
  alias?: string;
  labels?: string[];
  properties: Neo4jProperties;
};

type NodeMatchBuilderValidationResult =
  | { success: true }
  | { success: false; message: string };

// Class do build a match query for single nodes
export class NodeMatchBuilder implements IQueryBuilder {
  // The alias letter of the node
  private _alias?: string;

  // The labels of the node to select
  private _labels?: Set<string>;

  // The raw properties of the node to select {key: value}
  private _rawProperties?: Neo4jProperties;

  constructor(params?: NodeMatchBuilderContructor) {
    if (!params) return;

    this._alias = params.alias;
    this._labels = new Set(params.labels);
    this._rawProperties = params.properties;
  }

  /**
   * alternative constructor for the NodeMatchBuilder
   * @param params
   * @returns
   */
  static new(params: NodeMatchBuilderContructor): NodeMatchBuilder {
    return new NodeMatchBuilder(params);
  }

  /**
   * Returns the parameter key for the given key. This is used to create a parameterized query
   * @param key
   * @returns
   */
  private _getParameterKey(key: string): string {
    return `${this._alias}_${key}`;
  }

  /**
   * Check if the build query is valid. Checks if the alias is set, and atleast one label or property is set
   * @returns true if the query is valid, false otherwise
   * @private
   */
  private _checkValid(): NodeMatchBuilderValidationResult {
    if (!this._alias) return { success: false, message: "Alias is not set" };
    if (!this._labels && !this._rawProperties) {
      return {
        success: false,
        message: "Atleast one label or property must be set",
      };
    }

    return {
      success: true,
    };
  }

  /**
   * Get the labels string for the query
   * @returns
   */
  private _getLabels(): string {
    if (!this._labels) {
      return "";
    }

    return ":" + Array.from(this._labels).join(":");
  }

  /**
   * Get the parameterized properties of the node. This is used to create a parameterized query
   * @returns
   */
  private _getParameterizedProperties() {
    const queryObjs: string[] = [];
    const parameters = Object.entries(this._rawProperties ?? {}).reduce(
      (acc, [key, value]) => {
        const paramKey = this._getParameterKey(key);
        queryObjs.push(`${key}: $${paramKey}`); // NOTE: add $ to the parameter key
        acc[paramKey] = value;
        return acc;
      },
      {} as Neo4jProperties
    );

    return {
      query: ` {${queryObjs.join(", ")}}`,
      parameters,
    };
  }

  /**
   * Set the alias of the node (overwrites the previous alias)
   * @param alias
   * @returns
   */
  public setAlias(alias: string): NodeMatchBuilder {
    this._alias = alias;
    return this;
  }

  /**
   * Overwrite the labels/types of the node
   * @param labels The labels to replace the existing labels
   * @returns
   */
  public setLabels(labels: string[]): NodeMatchBuilder {
    this._labels = new Set(labels);
    return this;
  }

  /**
   * Add a label to the node (append to the existing labels)
   * @param label The label to add
   * @returns
   */
  public addLabel(label: string): NodeMatchBuilder {
    if (!this._labels) {
      this._labels = new Set();
    }

    // If the label already exists, show a warning
    if (this._labels.has(label)) {
      console.warn(`Label ${label} already exists`);
    }

    this._labels.add(label);
    return this;
  }

  /**
   * Set the properties of the node (overwrites the existing properties)
   * @param properties The properties to set
   * @returns
   */
  public setProperties(properties: Neo4jProperties): NodeMatchBuilder {
    this._rawProperties = properties;
    return this;
  }

  /**
   * Add a property to the node (append to the existing properties)
   * @param key The key of the property
   * @param value The value of the property
   * @returns
   */
  public addProperty(key: string, value: Neo4jPrimitive): NodeMatchBuilder {
    if (!this._rawProperties) {
      this._rawProperties = {};
    }

    this._rawProperties[key] = value;
    return this;
  }

  /**
   * Get the node query part of the query
   *
   * ```cypher
   * (n:Person {name: "John Doe", age: 30})
   * ```
   */
  toParameterizedQuery(): ParameterizedQuery {
    const validationResult = this._checkValid();
    if (!validationResult.success) {
      throw new QueryBuilderException(validationResult.message);
    }

    const labels = this._getLabels();
    const properties = this._getParameterizedProperties();

    // In format: (alias:Label {properties}) or (alias {properties}) or (alias:Label)
    return {
      query: `(${this._alias}${labels}${properties.query})`,
      parameters: properties.parameters,
    };
  }

  /**
   * Return the full query of the node
   * Since this class is for a single node, only the single node query is returned
   */
  toRawQuery(): string {
    const { query, parameters } = this.toParameterizedQuery();

    // Replace all the parameters with the actual values
    return replaceQueryParameters(query, parameters);
  }

  toString(): string {
    return this.toRawQuery();
  }
}

export class Neo4jQueryBuilder {}
