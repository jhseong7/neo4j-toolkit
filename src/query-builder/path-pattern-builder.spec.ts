import { PathPatternBuilder } from "./path-pattern-builder";

describe("PathPatternBuilder", () => {
  describe("Test simple path patterns", () => {
    it("Test (n)", () => {
      const builder = PathPatternBuilder.new().setNode({
        alias: "n",
      });

      expect(builder.toRawQuery()).toBe("(n)");
    });

    it("Test (n:Person)", () => {
      const builder = PathPatternBuilder.new().setNode({
        alias: "n",
        labels: ["Person"],
      });

      expect(builder.toRawQuery()).toBe("(n:Person)");
    });

    it("Test Single node (n:Person {name: 'John Doe'})", () => {
      const builder = PathPatternBuilder.new().setNode({
        alias: "n",
        labels: ["Person"],
        properties: {
          name: "John Doe",
        },
      });

      expect(builder.toRawQuery()).toBe(`(n:Person {name: "John Doe"})`);
    });

    it("Test node to node undirected node (n)--(m)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .addNode({ alias: "m" });

      expect(builder.toRawQuery()).toBe(`(n)--(m)`);
    });

    it("Test node to node directed node (n)-->(m)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toNode({ alias: "m" });

      expect(builder.toRawQuery()).toBe(`(n)-->(m)`);
    });

    it("Test node to node directed node with relation (n)<--(m)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromNode({ alias: "m" });

      expect(builder.toRawQuery()).toBe(`(n)<--(m)`);
    });

    it("Test node to node with relation (n)-[r]-(m)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toRelationship({ alias: "r" })
        .toNode({ alias: "m" });

      expect(builder.toRawQuery()).toBe(`(n)-[r]->(m)`);
    });

    it("Test node to node with relation (n)<-[r]-(m)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromRelationship({ alias: "r" })
        .fromNode({ alias: "m" });

      expect(builder.toRawQuery()).toBe(`(n)<-[r]-(m)`);
    });

    it("Test node -> rel <- node", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toRelationship({ alias: "r" })
        .fromNode({ alias: "m" });

      expect(builder.toRawQuery()).toBe(`(n)-[r]-(m)`);
    });

    it("Test complex path pattern (n)<-[r1]-(m)-[r2]->(o)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromRelationship({ alias: "r1" })
        .fromNode({ alias: "m" })
        .toRelationship({ alias: "r2" })
        .toNode({ alias: "o" });

      expect(builder.toRawQuery()).toBe(`(n)<-[r1]-(m)-[r2]->(o)`);
    });

    it("Test complex path pattern (n)<-[r1]-(m)-[r2]->(o)--(p)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromRelationship({ alias: "r1" })
        .fromNode({ alias: "m" })
        .toRelationship({ alias: "r2" })
        .toNode({ alias: "o" })
        .addNode({ alias: "p" });

      expect(builder.toRawQuery()).toBe(`(n)<-[r1]-(m)-[r2]->(o)--(p)`);
    });

    it("Test very long one way path pattern (n)-[r]->(m)-[r2]->(o)-[r3]->(p)-->(p2)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toRelationship({ alias: "r" })
        .toNode({ alias: "m" })
        .toRelationship({ alias: "r2" })
        .toNode({ alias: "o" })
        .toRelationship({ alias: "r3" })
        .toNode({ alias: "p" })
        .toNode({ alias: "p2" });

      expect(builder.toRawQuery()).toBe(
        `(n)-[r]->(m)-[r2]->(o)-[r3]->(p)-->(p2)`
      );
    });

    it("Test very long one way path pattern reversed (n)<-[r]-(m)<-[r2]-(o)<-[r3]-(p)<--(p2)", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromRelationship({ alias: "r" })
        .fromNode({ alias: "m" })
        .fromRelationship({ alias: "r2" })
        .fromNode({ alias: "o" })
        .fromRelationship({ alias: "r3" })
        .fromNode({ alias: "p" })
        .fromNode({ alias: "p2" });

      expect(builder.toRawQuery()).toBe(
        `(n)<-[r]-(m)<-[r2]-(o)<-[r3]-(p)<--(p2)`
      );
    });

    it("Test a single relation to create ghost node ()-[r]->()", () => {
      const builder = PathPatternBuilder.new().setRelationship({ alias: "r" });

      expect(builder.toRawQuery()).toBe(`()-[r]->()`);
    });

    it("Test ghost head node generation ()-[r]->(n)", () => {
      const builder = PathPatternBuilder.new()
        .setRelationship({ alias: "r" })
        .toNode({ alias: "n" });

      expect(builder.toRawQuery()).toBe(`()-[r]->(n)`);
    });

    it("Test ghost head node generation reversed (n)<-[r]-()", () => {
      const builder = PathPatternBuilder.new()
        .setRelationship({ alias: "r" })
        .fromNode({ alias: "n" });

      expect(builder.toRawQuery()).toBe(`()<-[r]-(n)`);
    });

    it("Test a dangling relation to node (n)-[r]->()", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toRelationship({ alias: "r" });

      expect(builder.toRawQuery()).toBe(`(n)-[r]->()`);
    });

    it("Test a dangling relation to node (n)<-[r]-()", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromRelationship({ alias: "r" });

      expect(builder.toRawQuery()).toBe(`(n)<-[r]-()`);
    });

    it("Test dangling relation for long path (n)-[r]->(m)-[r2]->()", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toRelationship({ alias: "r" })
        .toNode({ alias: "m" })
        .toRelationship({ alias: "r2" });

      expect(builder.toRawQuery()).toBe(`(n)-[r]->(m)-[r2]->()`);
    });

    it("Test dangling relation for long path (n)<-[r]-(m)<-[r2]-()", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .fromRelationship({ alias: "r" })
        .fromNode({ alias: "m" })
        .fromRelationship({ alias: "r2" });

      expect(builder.toRawQuery()).toBe(`(n)<-[r]-(m)<-[r2]-()`);
    });
  });

  describe("Test patterns with labels and properties", () => {
    it("Test single node with labels and properties", () => {
      const builder = PathPatternBuilder.new().setNode({
        alias: "n",
        labels: ["Person"],
        properties: {
          name: "John Doe",
          age: 30,
        },
      });

      expect(builder.toRawQuery()).toBe(
        `(n:Person {name: "John Doe", age: 30})`
      );
    });

    it("Test single relation with labels and properties", () => {
      const builder = PathPatternBuilder.new().setRelationship({
        alias: "r",
        label: "KNOWS",
        properties: {
          since: 2010,
        },
      });

      expect(builder.toRawQuery()).toBe(`()-[r:KNOWS {since: 2010}]->()`);
    });

    it("Test short node-rel->node with labels and properties", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n", labels: ["Person"] })
        .toRelationship({
          alias: "r",
          label: "KNOWS",
          properties: { since: 2010 },
        })
        .toNode({
          alias: "m",
          labels: ["Person"],
          properties: { name: "John Doe" },
        });

      expect(builder.toRawQuery()).toBe(
        `(n:Person)-[r:KNOWS {since: 2010}]->(m:Person {name: "John Doe"})`
      );
    });

    it("Test short path with missing aliases for some elements", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ labels: ["Person"] })
        .toRelationship({
          alias: "r",
          label: "KNOWS",
          properties: { since: 2010 },
        })
        .toNode({
          labels: ["Person"],
          properties: { name: "John Doe" },
        });

      expect(builder.toRawQuery()).toBe(
        `(:Person)-[r:KNOWS {since: 2010}]->(:Person {name: "John Doe"})`
      );
    });

    it("Test long path with complex labels and properties", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n", labels: ["Person"] })
        .toRelationship({
          alias: "r",
          label: "KNOWS",
          properties: { since: 2010 },
        })
        .toNode({
          alias: "m",
          labels: ["Person"],
          properties: { name: "John Doe" },
        })
        .toRelationship({
          alias: "r2",
          label: "LIKES",
          properties: { rating: 5 },
        })
        .toNode({
          alias: "o",
          labels: ["Person"],
          properties: { name: "Jane Doe" },
        });

      expect(builder.toRawQuery()).toBe(
        `(n:Person)-[r:KNOWS {since: 2010}]->(m:Person {name: "John Doe"})-[r2:LIKES {rating: 5}]->(o:Person {name: "Jane Doe"})`
      );
    });
  });

  describe("Test exception cases", () => {
    it("Duplicate alias", () => {
      const builder = PathPatternBuilder.new()
        .setNode({ alias: "n" })
        .toNode({ alias: "n" });

      expect(() => builder.toRawQuery()).toThrow();
    });

    it("relation to relation", () => {
      expect(() =>
        PathPatternBuilder.new()
          .setRelationship({ alias: "r" })
          .toRelationship({ alias: "r2" })
      ).toThrow();
    });

    it("add multiple start elements", () => {
      expect(() => PathPatternBuilder.new().setNode({}).setNode({})).toThrow();

      expect(() =>
        PathPatternBuilder.new().setNode({}).setRelationship({})
      ).toThrow();

      expect(() =>
        PathPatternBuilder.new().setRelationship({}).setRelationship({})
      ).toThrow();
    });

    it("Add node or relationship without startnode", () => {
      expect(() => PathPatternBuilder.new().toNode({})).toThrow();
      expect(() => PathPatternBuilder.new().toRelationship({})).toThrow();
    });

    it("If no element has alias, throw error", () => {
      expect(() =>
        PathPatternBuilder.new()
          .addNode({ labels: ["Person"] })
          .toNode({ properties: { name: "John Doe" } })
          .toParameterizedQuery()
      ).toThrow();
    });
  });
});
