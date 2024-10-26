import { QueryBuilder } from "./query-builder";

describe("QueryBuilder", () => {
  describe("<MATCH>", () => {
    it("Test basic match", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .return("n");

      // Replace all newlines for easier comparison
      expect(builder.toRawQuery()).toBe("MATCH (n)\n" + "RETURN n\n");
    });

    it("Test simple where clause", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .where((w) => w.add('n.name = "value"'))
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + 'WHERE n.name = "value"\n' + "RETURN n\n"
      );
    });

    it("Test multiple where clause", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .where((w) => w.add('n.name = "value"').and("n.age = 10"))
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + 'WHERE n.name = "value" AND n.age = 10\n' + "RETURN n\n"
      );
    });

    it("(throw test) missing alias in where clause", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .where((w) => w.add('m.name = "value"'))
        .return("n");

      expect(() => {
        builder.where((w) => w.add('m.name = "value"')).toRawQuery();
      }).toThrow();
    });

    it("(throw test) return and finish given together", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .where((w) => w.add('n.name = "value"'))
        .finish()
        .return(["n"]);

      expect(() => {
        builder.toRawQuery();
      }).toThrow();
    });

    it("Test order by clause", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .orderBy("n.name", "ASC")
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + "ORDER BY n.name ASC\n" + "RETURN n\n"
      );
    });

    it("(throw test) orderby twice", () => {
      expect(() => {
        QueryBuilder.new()
          .match((p) => p.setNode({ alias: "n" }))
          .orderBy("n.name", "ASC")
          .orderBy("n.age", "DESC");
      }).toThrow();
    });

    it("Test multiple order by clause", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .orderBy("n.name", "ASC")
        .addOrderBy("n.age", "DESC")
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + "ORDER BY n.name ASC, n.age DESC\n" + "RETURN n\n"
      );
    });

    it("Test multiple order by clause with partial unspecified direction", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .orderBy("n.name")
        .addOrderBy("n.age", "ASC")
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + "ORDER BY n.name ASC, n.age ASC\n" + "RETURN n\n"
      );
    });

    it("Test multiple order by starting with addOrderBy (allowed)", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .addOrderBy("n.name", "ASC")
        .addOrderBy("n.age", "DESC")
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + "ORDER BY n.name ASC, n.age DESC\n" + "RETURN n\n"
      );
    });

    it("Test skip, limit, offset", () => {
      const builder = QueryBuilder.new()
        .match((p) => p.setNode({ alias: "n" }))
        .skip(10)
        .limit(5)
        .offset(2)
        .return("n");

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)\n" + "SKIP 10\n" + "LIMIT 5\n" + "OFFSET 2\n" + "RETURN n\n"
      );
    });

    it("Test chained match builder pattern", () => {
      const builder = QueryBuilder.new()
        .match(
          (p) => {
            p.setNode({ alias: "n" })
              .toRelationship({ alias: "r", label: "KNOWS" })
              .toNode({ alias: "m" });
          },
          (p) => {
            p.setNode({ alias: "k" });
          }
        )
        .return(["n", "r", "m", "k"]);

      expect(builder.toRawQuery()).toBe(
        "MATCH (n)-[r:KNOWS]->(m), (k)\n" + "RETURN n, r, m, k\n"
      );
    });
  });
});
