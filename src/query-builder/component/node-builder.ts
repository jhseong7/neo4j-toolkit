import type { Neo4jPrimitive, Neo4jProperties } from "@/types";

import { QueryBuilderException } from "../exception";
import type { IQueryBuilder, ParameterizedQuery } from "../type";
import { replaceQueryParameters } from "../util";
import { CommonBuilder } from "./base-builder";

export type NodePatternBuilderContructor = {
  alias?: string;
  labels?: string[];
  properties?: Neo4jProperties;
};

type NodePatternBuilderValidationResult =
  | { success: true }
  | { success: false; message: string };

// Class do build a match query for single nodes
export class NodePatternBuilder extends CommonBuilder implements IQueryBuilder {
  // The labels of the node to select
  private _labels?: Set<string>;

  constructor(params?: NodePatternBuilderContructor) {
    super();
    if (!params) return;

    this._alias = params.alias;
    this._labels = new Set(params.labels);
    this._rawProperties = params.properties;
  }

  /**
   * alternative constructor for the NodePatternBuilder
   * @param params
   * @returns
   */
  public static new(params?: NodePatternBuilderContructor): NodePatternBuilder {
    return new NodePatternBuilder(params);
  }

  /**
   * Check if the build query is valid. Checks if the alias is set, and atleast one label or property is set
   * @returns true if the query is valid, false otherwise
   * @private
   */
  private _checkValid(): NodePatternBuilderValidationResult {
    // NOTE: alias can be null, it will only cause an error when building the full query
    // if (!this._alias) return { success: false, message: "Alias is not set" };
    // if (!this._labels && !this._rawProperties) {
    //   return {
    //     success: false,
    //     message: "At least one label or property must be set",
    //   };
    // }

    return {
      success: true,
    };
  }

  /**
   * Get the labels string for the query
   * @returns
   */
  private _getLabels(): string {
    if (!this._labels || this._labels.size === 0) {
      return "";
    }

    return ":" + Array.from(this._labels).join(":");
  }

  /**
   * Set the alias of the node (overwrites the previous alias)
   * @param alias
   * @returns
   */
  public setAlias(alias: string): NodePatternBuilder {
    if (this._alias) {
      this._printWarning(
        `Alias ${this._alias} will be overwritten with ${alias}`
      );
    }

    this._alias = alias;
    return this;
  }

  /**
   * Overwrite the labels/types of the node
   * @param labels The labels to replace the existing labels
   * @returns
   */
  public setLabels(labels: string[]): NodePatternBuilder {
    if (labels.length === 0) {
      throw new QueryBuilderException("At least one label must be provided");
    }

    if (this._labels && this._labels.size > 0) {
      this._printWarning(
        `Labels ${Array.from(this._labels).join(
          ", "
        )} will be overwritten with ${labels.join(", ")}`
      );
    }

    this._labels = new Set(labels);
    return this;
  }

  /**
   * Add a label to the node (append to the existing labels)
   * @param label The label to add
   * @returns
   */
  public addLabel(label: string): NodePatternBuilder {
    if (!this._labels) {
      this._labels = new Set();
    }

    // If the label already exists, show a warning
    if (this._labels.has(label)) {
      this._printWarning(`Label ${label} already exists`);
    }

    this._labels.add(label);
    return this;
  }

  /**
   * Set the properties of the node (overwrites the existing properties)
   * @param properties The properties to set
   * @returns
   */
  public setProperties(properties: Neo4jProperties): NodePatternBuilder {
    this._rawProperties = properties;
    return this;
  }

  /**
   * Add a property to the node (append to the existing properties)
   * @param key The key of the property
   * @param value The value of the property
   * @returns
   */
  public addProperty(key: string, value: Neo4jPrimitive): NodePatternBuilder {
    if (!this._rawProperties) {
      this._rawProperties = {};
    }

    if (this._rawProperties[key]) {
      this._printWarning(
        `Property ${key} already exists. It will be overwritten`
      );
    }

    this._rawProperties[key] = value;
    return this;
  }

  /**
   * Add multiple properties to the node
   * @param properties
   * @returns
   */
  public addProperties(properties: Neo4jProperties): NodePatternBuilder {
    for (const key in properties) {
      this.addProperty(key, properties[key]);
    }

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
      aliasSet: new Set([this._getAlias()]), // This not null if _checkValid passes
      query: `(${this._getAlias()}${labels}${properties.query})`,
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
