import { Neo4jProperties } from "../../types";
import { QueryBuilderException } from "../exception";

export class CommonBuilder {
  // The alias letter of the node
  protected _alias?: string;

  // The raw properties of the node to select {key: value}
  protected _rawProperties?: Neo4jProperties;

  protected _printWarning(message: string) {
    // Replace this with a logger so it is customizable by the user
    console.warn(message);
  }

  protected _getAlias(): string {
    return this._alias ?? "";
  }

  /**
   * Returns the parameter key for the given key. This is used to create a parameterized query
   * @param key
   * @returns
   * @protected
   */
  protected _getParameterKey(key: string, aliasKey?: string): string {
    if (!this._alias && !aliasKey) {
      throw new QueryBuilderException(
        "Alias is not set, cannot create parameter key"
      );
    }

    return `${aliasKey}_${key}`;
  }

  /**
   * Get the parameterized properties of the node. This is used to create a parameterized query
   * @returns
   */
  protected _getParameterizedProperties() {
    if (!this._rawProperties || Object.keys(this._rawProperties).length === 0) {
      return {
        query: "",
        parameters: {},
      };
    }

    // if alias is not set, set a random 3 letter alias
    let aliasKey =
      (this._alias ?? "r") + (Math.random() + 1).toString(36).substring(7);

    const queryObjs: string[] = [];
    const parameters = Object.entries(this._rawProperties ?? {}).reduce(
      (acc, [key, value]) => {
        const paramKey = this._getParameterKey(key, aliasKey);
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
}
