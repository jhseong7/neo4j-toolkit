import { WhereClauseBuilder } from "./where-clause-builder";

describe("WhereClauseBuilder", () => {
  it("Test empty", () => {
    const builder = new WhereClauseBuilder();
    expect(builder.toRawQuery()).toBe(""); // Empty if no properties or statements
  });

  it("Test invalid alias creation (must throw)", () => {
    const TEST_STATEMENT = 'n.name = "value"';

    const builder = new WhereClauseBuilder({ aliases: ["a"] }).add(
      TEST_STATEMENT
    );

    expect(() => {
      builder.toRawQuery();
    }).toThrow();
  });

  it("Test single statement input", () => {
    const TEST_STATEMENT = 'n.name = "value"';

    const builder = new WhereClauseBuilder({ aliases: ["n"] }).add(
      TEST_STATEMENT
    );

    expect(builder.toRawQuery()).toBe("WHERE " + TEST_STATEMENT);
  });

  it("Test single statement with properties", () => {
    const TEST_STATEMENT = "n.name = $name";

    const builder = new WhereClauseBuilder({ aliases: ["n"] }).add(
      TEST_STATEMENT,
      {
        name: "value",
      }
    );

    expect(builder.toRawQuery()).toBe(
      `WHERE ${TEST_STATEMENT.replace("$name", '"value"')}`
    );
  });

  it("Test multiple statements with the same alias", () => {
    const builder = new WhereClauseBuilder({ aliases: ["n"] })
      .add("n.name = $name", { name: "value" })
      .and("n.age = $age", { age: 10 });

    expect(builder.toRawQuery()).toBe('WHERE n.name = "value" AND n.age = 10');
  });

  it("Test multiple statements without properties", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add('n.name = "value"')
      .and("m.age = 10");

    expect(builder.toRawQuery()).toBe('WHERE n.name = "value" AND m.age = 10');
  });

  it("Test multiple statements with properties", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name = $name", { name: "value" })
      .and("m.age = $age", { age: 10 });

    expect(builder.toRawQuery()).toBe('WHERE n.name = "value" AND m.age = 10');
  });

  it("Test multiple statements with same property key different values - testing randomizer", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name = $name", { name: "value1" })
      .and("m.age = $name", { name: "value2" });

    expect(builder.toRawQuery()).toBe(
      'WHERE n.name = "value1" AND m.age = "value2"'
    );
  });

  it("Test and + or chaining", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name = $name", { name: "value1" })
      .and("m.age = $name", { name: "value2" })
      .or("n.age = $age", { age: 10 });

    expect(builder.toRawQuery()).toBe(
      'WHERE n.name = "value1" AND m.age = "value2" OR n.age = 10'
    );
  });

  it("Test bracketed statements for and", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name = $name", { name: "value1" })
      .and((b) => b.add("m.age = $name", { name: "value2" }).or("m.age = 10"));

    expect(builder.toRawQuery()).toBe(
      'WHERE n.name = "value1" AND ( m.age = "value2" OR m.age = 10 )'
    );
  });

  it("Test bracketed statements for or", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name = $name", { name: "value1" })
      .or((b) => b.add("m.age = $name", { name: "value2" }).and("m.age = 10"));

    expect(builder.toRawQuery()).toBe(
      'WHERE n.name = "value1" OR ( m.age = "value2" AND m.age = 10 )'
    );
  });

  it("Test bracketed statement nesting", () => {
    const builder = new WhereClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name = $name", { name: "value1" })
      .and((b) => {
        b.add("m.age = $name", { name: "value2" }).or((b) => {
          b.add("m.age = 10").and((b) => {
            b.add("m.age = 20").or("m.age = 30");
          });
        });
      });

    expect(builder.toRawQuery()).toBe(
      'WHERE n.name = "value1" AND ( m.age = "value2" OR ( m.age = 10 AND ( m.age = 20 OR m.age = 30 ) ) )'
    );
  });

  it("Test setAliasList", () => {
    const builder = new WhereClauseBuilder()
      .add("n.name = $name", { name: "value1" })
      .and("m.age = $age", { age: 10 })
      .setAliasList(["n", "m"]);

    expect(builder.toRawQuery()).toBe('WHERE n.name = "value1" AND m.age = 10');
  });
});
