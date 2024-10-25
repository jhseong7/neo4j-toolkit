import { NodePatternBuilder } from "./node-builder";

describe("NodeBuilder", () => {
  it("Test (n)", () => {
    const builder = NodePatternBuilder.new().setAlias("n");

    expect(builder.toRawQuery()).toBe("(n)");
  });

  it("Test (n:Label)", () => {
    const randomLabel =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addLabel(randomLabel);

    expect(builder.toRawQuery()).toBe(`(n:${randomLabel})`);
  });

  it("Test multiple labels", () => {
    const randomLabel1 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const randomLabel2 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addLabel(randomLabel1)
      .addLabel(randomLabel2);

    expect(builder.toRawQuery()).toBe(`(n:${randomLabel1}:${randomLabel2})`);
  });

  it("Test overwrite multiple labels", () => {
    const randomLabel1 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const randomLabel2 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const randomLabel3 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const randomLabel4 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addLabel(randomLabel1)
      .addLabel(randomLabel2)
      .setLabels([randomLabel3, randomLabel4]);

    expect(builder.toRawQuery()).toBe(`(n:${randomLabel3}:${randomLabel4})`);
  });

  it("Test properties (n {prop1: 'value1'})", () => {
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1");

    expect(builder.toRawQuery()).toBe(`(n {prop1: "value1"})`);
  });

  it("Test multiple properties", () => {
    const builder = NodePatternBuilder.new().setAlias("n").addProperties({
      prop1: "value1",
      prop2: 10,
      prop3: true,
    });

    expect(builder.toRawQuery()).toBe(
      `(n {prop1: "value1", prop2: 10, prop3: true})`
    );
  });

  it("Test properties overwrite with setProperties", () => {
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1")
      .setProperties({ prop2: 10 });

    expect(builder.toRawQuery()).toBe(`(n {prop2: 10})`);
  });

  it("Test properties for various types", () => {
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1")
      .addProperty("prop2", 10)
      .addProperty("prop3", true);

    expect(builder.toRawQuery()).toBe(
      `(n {prop1: "value1", prop2: 10, prop3: true})`
    );
  });

  it("Test overwrite multiple properties", () => {
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1")
      .addProperty("prop2", 10)
      .addProperty("prop3", true)
      .setProperties({ prop4: "value4" });

    expect(builder.toRawQuery()).toBe(`(n {prop4: "value4"})`);
  });

  it("Test labels and properties together", () => {
    const randomLabel =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addLabel(randomLabel)
      .addProperty("prop1", "value1");

    expect(builder.toRawQuery()).toBe(`(n:${randomLabel} {prop1: "value1"})`);
  });

  it("Test multiple labels and properties together", () => {
    const randomLabel1 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const randomLabel2 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addLabel(randomLabel1)
      .addLabel(randomLabel2)
      .addProperty("prop1", "value1")
      .addProperty("prop2", 10)
      .addProperty("prop3", true);

    expect(builder.toRawQuery()).toBe(
      `(n:${randomLabel1}:${randomLabel2} {prop1: "value1", prop2: 10, prop3: true})`
    );
  });

  it("Test function calls in the properties (direct pass to query)", () => {
    const builder = NodePatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", () => "time('2021-01-01')");
    expect(builder.toRawQuery()).toBe(`(n {prop1: time('2021-01-01')})`);
  });
});
