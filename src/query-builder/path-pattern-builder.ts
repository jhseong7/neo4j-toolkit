import { Neo4jProperties } from "../types";
import {
  NodePatternBuilder,
  NodePatternBuilderContructor,
  RelationPatternBuilder,
  RelationPatternBuilderContructor,
} from "./component";
import { QueryBuilderException } from "./exception";
import { IQueryBuilder } from "./type";
import { mergeProperties, replaceQueryParameters } from "./util";

/**
 * The node representation in the match query this is used to build and chain match queries
 */
type PathPatternGraphElementNode = {
  type: "node";
  builder: NodePatternBuilder;
  nextType?:
    | "toNode" // ()-[]->()
    | "fromNode" // ()<-[]-()
    | "toRelationship"
    | "fromRelationship"
    | "unDirectedNode"; // () -- ()
  previous?: PathPatternGraphElement;
  next?: PathPatternGraphElement;
};

type PathPatternGraphElementRelationship = {
  type: "relationship";
  builder: IQueryBuilder;
  nextType?: "toNode" | "fromNode"; // The type of the next element used to determine the connection symbol
  previous?: PathPatternGraphElement;
  next?: PathPatternGraphElement;
};

type PathPatternGraphElement =
  | PathPatternGraphElementNode
  | PathPatternGraphElementRelationship;

function getConnectionSymbol(element: PathPatternGraphElement) {
  if (element.type === "node") {
    switch (element.nextType) {
      case "toNode":
        return "-->";
      case "fromNode":
        return "<--";
      case "toRelationship":
        return "-";
      case "fromRelationship":
        return "<-";
      case "unDirectedNode":
        return "--";
      case undefined:
      default:
        // Case of no next element
        return "";
    }
  }

  if (element.type === "relationship") {
    switch (element.nextType) {
      case "toNode":
        return "->";
      case "fromNode":
        return "-";
      case undefined:
      default:
        // Case of no next element
        return "";
    }
  }

  throw new QueryBuilderException("Unknown next element element type");
}

/**
 * Query builder for the match queries
 */
export class PathPatternBuilder {
  // Save all the elements in the match query

  // The first element in the match query
  private _startElement: PathPatternGraphElement | null = null;

  // The last element added to the match query. This is used to determine where to add the next element
  private _lastElement: PathPatternGraphElement | null = null;

  private _elementCnt = 0;

  constructor() {}

  private _printWarning(message: string) {
    // Replace this with a logger so it is customizable by the user
    console.warn(message);
  }

  public static new() {
    return new PathPatternBuilder();
  }

  /**
   * Add a node to the match query
   * This will throw if this is called twice with the same builder
   * @param node
   * @returns
   */
  public setNode(node: NodePatternBuilderContructor) {
    // Create a node element
    const element: PathPatternGraphElementNode = {
      type: "node",
      builder: new NodePatternBuilder(node),
    };

    // If there is no root node, set the root node to the new node
    if (this._startElement) {
      throw new QueryBuilderException("Cannot add multiple start elements.");
    }

    this._startElement = element;
    this._lastElement = element;
    this._elementCnt++;

    return this;
  }

  /**
   * Adds a root relationship to the match query.
   *
   * @param relationship
   */
  public setRelationship(relationship: RelationPatternBuilderContructor) {
    const element: PathPatternGraphElementRelationship = {
      type: "relationship",
      builder: new RelationPatternBuilder(relationship),
    };

    if (this._startElement) {
      throw new QueryBuilderException("Cannot add multiple start elements.");
    }

    // Set the start element as the from node as the path starts from there
    this._startElement = element;
    this._lastElement = element;

    this._elementCnt++;

    return this;
  }

  /**
   * Adds a relationship to the match query where the next element is a relationship to
   * it will add a ->[] connection
   *
   * This will throw if the last element is not a node
   *
   * ```cypher
   * # AS-IS
   * (n)
   *
   * # TO-BE
   * (n)-[]
   *
   * @param relationship
   */
  public toRelationship(relationship: RelationPatternBuilderContructor) {
    if (!this._lastElement) {
      throw new QueryBuilderException(
        "Cannot connect relationship to nothing. Add a node first"
      );
    }

    // If the type of the last element is not a node throw an error
    if (this._lastElement.type === "relationship") {
      throw new QueryBuilderException(
        "Cannot connect a relationship to a relationship"
      );
    }

    // Create a relationship element
    const element: PathPatternGraphElementRelationship = {
      type: "relationship",
      builder: new RelationPatternBuilder(relationship),
      previous: this._lastElement,
    };

    // Set the parameters to the last element
    this._lastElement.next = element;
    this._lastElement.nextType = "toRelationship";

    // Set the last element to the new relationship
    this._lastElement = element;

    this._elementCnt++;

    return this;
  }

  /**
   * Adds a relationship to the match query where the next element is a relationship from
   * it will add a <-[] connection
   *
   * ```cypher
   * # AS-IS
   * (n)
   *
   * # TO-BE
   * (n)<-[]
   * ```
   * @param relationship
   * @returns
   */
  public fromRelationship(relationship: RelationPatternBuilderContructor) {
    if (!this._lastElement) {
      throw new QueryBuilderException(
        "Cannot connect relationship to nothing. Add a node first"
      );
    }

    // Create a relationship element
    const element: PathPatternGraphElementRelationship = {
      type: "relationship",
      builder: new RelationPatternBuilder(relationship),
      previous: this._lastElement,
    };

    // Set the parameters to the last element
    this._lastElement.next = element;
    this._lastElement.nextType = "fromRelationship";

    // Set the last element to the new relationship
    this._lastElement = element;

    this._elementCnt++;

    return this;
  }

  /**
   * Connect the node to the last element in the match query.
   *
   * if the last element is a node a -- connection is added
   * if the last element is a  relationship, a -> connection is added
   *
   * ```cypher
   * // AS-IS *node*
   * (n)
   *
   * // TO-BE *node*
   * (n)-->()
   *
   * // AS-IS *relationship*
   * ()-[r]
   *
   * // TO-BE *relationship*
   * ()-[r]->()
   *
   * @param node
   * @returns
   */
  public toNode(node: NodePatternBuilderContructor) {
    if (!this._startElement) {
      throw new QueryBuilderException(
        "Cannot connect node to nothing. Add a start node or relationship first"
      );
    }

    if (!this._lastElement) {
      throw new QueryBuilderException(
        "Cannot connect node to nothing. Add a start node or relationship first"
      );
    }

    // Handle if the last element is a relationship + has no previous element (ghost node add)
    if (
      this._lastElement.type === "relationship" &&
      !this._lastElement.previous
    ) {
      // Add a ghost node to the start ()-[r]->(n)
      const startElement: PathPatternGraphElementNode = {
        type: "node",
        builder: new NodePatternBuilder({}),
        next: this._lastElement,
        nextType: "toRelationship",
      };
      this._lastElement.previous = startElement;
      this._startElement = startElement;
      this._elementCnt++;
    }

    // Create a node element
    const element: PathPatternGraphElementNode = {
      type: "node",
      builder: new NodePatternBuilder(node),
      previous: this._lastElement,
    };

    this._elementCnt++;

    if (this._lastElement.type === "relationship") {
      this._lastElement.next = element;
      this._lastElement.nextType = "toNode";
      this._lastElement = element;
      return this;
    }

    if (this._lastElement.type === "node") {
      this._lastElement.next = element;
      this._lastElement.nextType = "toNode";
      this._lastElement = element;
      return this;
    }

    throw new QueryBuilderException("Unknown element type");
  }

  /**
   * Connect the node to the last element in the match query.
   *
   * if the last element is a node a -- connection is added
   * if the last element is a  relationship, a <- connection is added
   *
   * ```cypher
   * # AS-IS *node*
   * (n)
   *
   * # TO-BE *node*
   * (n)<--()
   *
   *
   * @param node
   * @returns
   */
  public fromNode(node: NodePatternBuilderContructor) {
    if (!this._startElement) {
      throw new QueryBuilderException(
        "Cannot connect node to nothing. Add a start node or relationship first"
      );
    }

    if (!this._lastElement) {
      throw new QueryBuilderException(
        "Cannot connect node to nothing. Add a start node or relationship first"
      );
    }

    // Handle if the last element is a relationship + has no previous element (ghost node add)
    if (
      this._lastElement.type === "relationship" &&
      !this._lastElement.previous
    ) {
      // Add a ghost node to the start ()<-[r]-(n)
      const startElement: PathPatternGraphElementNode = {
        type: "node",
        builder: new NodePatternBuilder({}),
        next: this._lastElement,
        nextType: "fromRelationship",
      };
      this._lastElement.previous = startElement;
      this._startElement = startElement;
      this._elementCnt++;
    }

    /**
     * if the last element is a node, print a warning to show that the connection will be incorrect (node to node connection)
     * node -- node connections to not have a direction
     */

    // Create a node element
    const element: PathPatternGraphElementNode = {
      type: "node",
      builder: new NodePatternBuilder(node),
      previous: this._lastElement,
    };

    this._elementCnt++;

    this._lastElement.next = element;
    this._lastElement.nextType = "fromNode";
    this._lastElement = element;
    return this;
  }

  /**
   * Add a un-directed node to the query
   *
   * () -- ()
   *
   * @param node
   * @returns
   */
  public addNode(node: NodePatternBuilderContructor) {
    if (!this._startElement) {
      throw new QueryBuilderException(
        "Cannot connect node to nothing. Add a start node or relationship first"
      );
    }

    if (!this._lastElement) {
      throw new QueryBuilderException(
        "Cannot connect node to nothing. Add a start node or relationship first"
      );
    }

    // Cannot add a un-directed node to a relationship
    if (this._lastElement.type === "relationship") {
      throw new QueryBuilderException(
        "Cannot connect a node to a relationship without a direction. This results in a []--() type of query"
      );
    }

    // Create a node element
    const element: PathPatternGraphElementNode = {
      type: "node",
      builder: new NodePatternBuilder(node),
      previous: this._lastElement,
    };

    this._elementCnt++;

    this._lastElement.next = element;
    this._lastElement.nextType = "unDirectedNode";
    this._lastElement = element;
    return this;
  }

  public toParameterizedQuery() {
    // If no start element or last element is set, throw an error
    if (!this._startElement || !this._lastElement) {
      throw new QueryBuilderException(
        "Cannot build an empty query. Add at least one node or relationship"
      );
    }

    // If the last element is a relationship, add an empty node to the end
    // If only 1 element is present,
    if (this._lastElement?.type === "relationship") {
      // Special case if only one element is present -> add both from and to ghost nodes
      if (this._elementCnt === 1) {
        this._printWarning(
          "Only one element is present. Adding a ghost node to the start and end"
        );

        const startElement: PathPatternGraphElementNode = {
          type: "node",
          builder: new NodePatternBuilder({}),
          next: this._lastElement,
          nextType: "toRelationship",
        };

        this._startElement = startElement;
        this._elementCnt += 1;

        this._lastElement.previous = startElement;

        this.toNode({});
      } else {
        this._printWarning(
          "Last element is a relationship. Adding an empty node to the end"
        );

        // Add the dangling node type depending on the connection type
        if (this._lastElement.previous?.nextType === "fromRelationship") {
          // Case of (n)<-[r]-()
          this.fromNode({});
        } else if (this._lastElement.previous?.nextType === "toRelationship") {
          // Case of (n)-[r]->()
          this.toNode({});
        } else {
          throw new QueryBuilderException("Unknown connection type");
        }
      }
    }

    // From the root node --> add the query to the query builder
    let queryString = "";
    const queryParameters: Neo4jProperties = {};

    let currentElement: PathPatternGraphElement | undefined =
      this._startElement;

    // From the start element -> build the query one by one
    const aliasSet = new Set<string>();

    while (this._elementCnt-- > 0) {
      if (!currentElement) {
        throw new QueryBuilderException(
          "Cannot build an empty query. Add at least one node or relationship"
        );
      }

      const { builder } = currentElement;
      const { alias, query, parameters } = builder.toParameterizedQuery();
      if (alias) {
        if (aliasSet.has(alias)) {
          throw new QueryBuilderException(
            `Alias ${alias} already exists. Aliases must be unique`
          );
        }
        aliasSet.add(alias);
      }

      // Add the query to the query string
      queryString += query;

      // Merge the parameters
      mergeProperties(queryParameters, parameters);

      // Get the connection symbol
      const connectionSymbol = getConnectionSymbol(currentElement);

      // Add the connection symbol to the query
      queryString += connectionSymbol;

      // Move to the next element
      currentElement = currentElement.next;
    }

    // If the aliases are all emtpy, throw an error
    if (aliasSet.size === 0) {
      throw new QueryBuilderException(
        "At least one alias must be provided in the query"
      );
    }

    return {
      aliases: Array.from(aliasSet),
      query: queryString,
      parameters: queryParameters,
    };
  }

  public toRawQuery(): string {
    const { query, parameters } = this.toParameterizedQuery();

    // Replace all the parameters with the actual values
    return replaceQueryParameters(query, parameters);
  }

  public toString(): string {
    return this.toRawQuery();
  }
}
