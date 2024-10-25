import { Neo4jProperties } from "../types";
import { QueryBuilderException } from "./exception";
import { mergeProperties } from "./util";

type WhereStatement = {
  statement: string;
  parameters?: Neo4jProperties;
};

// The node that holds the statement
type WhereNodeStatement = WhereStatement & {
  type: "statement";
};

// Representation of the AND group
type WhereNodeAndGroup = {
  type: "and";
};

// Representation of the OR group
type WhereNodeOrGroup = {
  type: "or";
};

// Node to save the bracketed where clause
type WhereNodeBracket = {
  type: "bracket";
  subNodes: WhereNode[];
};

// Node of the where clause structure.
type WhereNode =
  | WhereNodeStatement
  | WhereNodeAndGroup
  | WhereNodeOrGroup
  | WhereNodeBracket;

// Type for the sub builder function
type WhereBuilderFunction = (builder: WhereClauseBuilder) => unknown;

export class WhereClauseBuilder {
  private _aliasSet: Set<string> = new Set();
  private _parameters: Neo4jProperties = {};

  // the graph structure to hold the where clause
  private _whereNodeList: WhereNode[] = [];

  constructor(params?: { aliases?: string[]; properties?: Neo4jProperties }) {
    const { aliases = [], properties = {} } = params ?? {};

    this._aliasSet = new Set(aliases);
    this._parameters = properties;
  }

  /**
   * Check the parameters for the where clause. If the parameters are not valid, return false
   * @param statement
   * @param parameters
   */
  private _checkParameterValid(
    statement: string,
    parameters: Neo4jProperties
  ): boolean {
    // Get all the key list in format of $key in the statement
    const keys = statement.match(/\$[a-zA-Z0-9]+/g);

    if (!keys) return false;

    // Check if the values for the keys are present in the parameters
    for (const key of keys) {
      // Drop the $ from the first character
      if (!parameters[key.substring(1)]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Randomize the key to prevent key collision for the parameters for each statement
   * @param key
   * @returns
   */
  private _randomizeKey(key: string): string {
    // Add a randomKey to the end of the key
    return `${key}_${Math.floor(Math.random() * 100).toString(36)}`;
  }

  private _printWarning(message: string) {
    console.warn(`[WARNING]: ${message}`);
  }

  /**
   * Replace the process parameters in the statement to a more random key to prevent key collision
   * @param statement
   * @param parameters
   */
  private _randomizeParameterKeys(
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

    console.log(keys);

    for (const key of keys) {
      const newKey = this._randomizeKey(key);
      newStatement = statement.replace(key, newKey);
      newParameters[newKey] = parameters[key.substring(1)]; // Drop the $ from the key
    }

    return {
      statement: newStatement,
      parameters: newParameters,
    };
  }

  private _checkAliasValid(statement: string): boolean {
    // extract the alias value from the statement (n.name = $name --> n)
    const alias = statement.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\./);

    // If the alias match is not 1, then the alias is not valid
    if (!alias || alias.length !== 1) {
      return false;
    }

    // Get the alias value
    const aliasValue = alias[0].replace(".", "");

    // Check if the alias value is in the set
    return this._aliasSet.has(aliasValue);
  }

  private _createSingleStatement(
    statement: string,
    parameters?: Neo4jProperties
  ): WhereNodeStatement {
    // Check if the alias is valid
    if (!this._checkAliasValid(statement)) {
      throw new QueryBuilderException("Invalid alias in the where clause");
    }

    // Check if the parameters are valid
    if (parameters && !this._checkParameterValid(statement, parameters)) {
      throw new QueryBuilderException(
        "Parameters are not valid in the where clause"
      );
    }

    // Randomize the parameters
    const { statement: newStatement, parameters: newParameters } =
      this._randomizeParameterKeys(statement, parameters);

    // Add the parameters to the existing parameters
    mergeProperties(this._parameters, newParameters ?? {});

    return {
      type: "statement",
      statement: newStatement,
      parameters: newParameters,
    };
  }

  /**
   * The common logic for the node handler
   * @param arg1
   * @param arg2
   * @returns
   */
  private _commonNodeHandler(
    arg1: string | WhereBuilderFunction,
    arg2?: Neo4jProperties
  ): WhereNode {
    // Case where the first argument is a function --> Bracketed where clause
    let node: WhereNode;
    if (typeof arg1 === "function") {
      // Rename the argument for better readability
      const builderFunction = arg1;
      const builder = new WhereClauseBuilder({
        aliases: Array.from(this._aliasSet),
      }); // Create an empty where clause builder

      // Let user build the where clause
      builderFunction(builder);

      // Extract the parameters, aliasList and whereNodeList
      const { _parameters, _aliasSet, _whereNodeList } = builder;

      mergeProperties(this._parameters, _parameters);

      // Append the bracketed where clause to the whereNodeList
      node = {
        type: "bracket",
        subNodes: _whereNodeList,
      };
    } else {
      // Case 2: direct statement add
      const statement = arg1;
      const parameters = arg2;

      node = this._createSingleStatement(statement, parameters);
    }

    return node;
  }

  /**
   * Add the first statement to the where clause.
   * This function can only be called once in one where clause
   */
  public add(builderFunction: WhereBuilderFunction): WhereClauseBuilder;
  public add(
    statement: string,
    parameters?: Neo4jProperties
  ): WhereClauseBuilder;
  public add(
    arg1: string | WhereBuilderFunction,
    arg2?: Neo4jProperties
  ): WhereClauseBuilder {
    // If the length of the nodelist is not 0, throw an error
    if (this._whereNodeList.length !== 0) {
      throw new QueryBuilderException(
        "The add function must only be called once"
      );
    }

    const node = this._commonNodeHandler(arg1, arg2);
    this._whereNodeList.push(node);

    return this;
  }

  /**
   * And statement to the where clause this adds the AND statement after the last statement
   * @param builderFunction
   */
  public and(builderFunction: WhereBuilderFunction): WhereClauseBuilder;
  public and(
    statement: string,
    parameters?: Neo4jProperties
  ): WhereClauseBuilder;
  public and(
    arg1: string | WhereBuilderFunction,
    arg2?: Neo4jProperties
  ): WhereClauseBuilder {
    const node = this._commonNodeHandler(arg1, arg2);

    // Push the "and" node to the whereNodeList before the statement
    this._whereNodeList.push({ type: "and" });
    this._whereNodeList.push(node);

    return this;
  }

  /**
   * OR statement to the where clause this adds the OR statement after the last statement
   * @param builderFunction
   */
  public or(builderFunction: WhereBuilderFunction): WhereClauseBuilder;
  public or(
    statement: string,
    parameters?: Neo4jProperties
  ): WhereClauseBuilder;
  public or(
    arg1: string | WhereBuilderFunction,
    arg2?: Neo4jProperties
  ): WhereClauseBuilder {
    const node = this._commonNodeHandler(arg1, arg2);

    // Push the "and" node to the whereNodeList before the statement
    this._whereNodeList.push({ type: "or" });
    this._whereNodeList.push(node);

    return this;
  }

  private _buildNodes(
    nodes: WhereNode[],
    currentQueryList: string[],
    currentParameters: Neo4jProperties
  ) {
    for (const node of nodes) {
      switch (node.type) {
        case "statement": {
          const { statement, parameters } = node;
          currentQueryList.push(statement);
          mergeProperties(currentParameters, parameters);
          break;
        }
        case "and": {
          currentQueryList.push("AND");
          break;
        }
        case "or": {
          currentQueryList.push("OR");
          break;
        }
        case "bracket": {
          const { subNodes } = node;
          const { query, parameters } = this._buildNodes(subNodes, [], {});
          currentQueryList.push(`( ${query} )`);
          mergeProperties(currentParameters, parameters);
          break;
        }
      }
    }

    return {
      query: currentQueryList.join(" "),
      parameters: currentParameters,
    };
  }

  public toParameterizedQuery() {
    // In order -> build the where clause
    const result = this._buildNodes(this._whereNodeList, [], this._parameters);

    return result;
  }
}
