import { Driver, session } from "neo4j-driver";
import { SessionPoolManager } from "./manager";

describe("SessionPoolManager", () => {
  // mock the Driver

  it("should throw an error if the number of sessions is less than or equal to 0", () => {
    // Create the pool manager with 0 sessions
    // Expect an error to be thrown
    expect(() => {
      // Create the pool manager with 0 sessions
      new SessionPoolManager({
        neo4jDriver: {} as Driver,
        numberOfSessions: 0,
      });
    }).toThrow("numberOfSessions must be greater than 0");
  });

  it("Should call the session function the correct number of times", () => {
    const mockDriver = {
      session: jest.fn(),
    } as unknown as Driver;

    // Create the pool manager with random number of sessions between 10 and 30
    const numberOfSessions = Math.floor(Math.random() * 20) + 10;

    // Create the pool manager
    new SessionPoolManager({
      neo4jDriver: mockDriver,
      numberOfSessions,
    });

    // Expect the session function to be called the correct number of times
    expect(mockDriver.session).toHaveBeenCalledTimes(numberOfSessions);
  });

  it("Should call close on all the sessions when shutdown is called", async () => {
    const mockSessionClose = jest.fn();
    const mockDriver = {
      session: jest.fn(() => ({ close: mockSessionClose })),
      close: jest.fn(),
    } as unknown as Driver;

    // Create the pool manager with random number of sessions between 10 and 30
    const numberOfSessions = Math.floor(Math.random() * 20) + 10;

    // Create the pool manager
    const manager = new SessionPoolManager({
      neo4jDriver: mockDriver,
      numberOfSessions,
    });

    // Call shutdown
    await manager.shutdown();

    // Expect the session function to be called the correct number of times
    expect(mockDriver.session).toHaveBeenCalledTimes(numberOfSessions);

    // Expect the session close function to be called the correct number of times
    expect(mockSessionClose).toHaveBeenCalledTimes(numberOfSessions);

    // Expect the close function to be called the correct number of times
    expect(mockDriver.close).toHaveBeenCalledTimes(1);
  });
});
