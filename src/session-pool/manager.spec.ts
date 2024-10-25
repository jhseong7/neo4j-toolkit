import { Driver, session } from "neo4j-driver";
import { SessionPoolManager } from "./manager";
import { NoSessionException } from "./exception";

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
    }).toThrow("maxSession must be greater than 0");
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

  it("Throw error if the number of sessions exceeds the max session limit", () => {
    const mockLastBookmark = jest.fn();
    const mockDriver = {
      session: jest.fn(() => ({ lastBookmarks: mockLastBookmark })),
    } as unknown as Driver;

    // Create the pool manager with random number of sessions between 10 and 30
    const numberOfSessions = Math.floor(Math.random() * 20) + 10;

    // Create the pool manager
    const manager = new SessionPoolManager({
      neo4jDriver: mockDriver,
      numberOfSessions,
    });

    // Expect the session function to be called the correct number of times
    expect(mockDriver.session).toHaveBeenCalledTimes(numberOfSessions);

    // Call the getSession function to the number of sessions count
    for (let i = 0; i < numberOfSessions; i++) {
      manager.getSession();
    }

    // Expect an error to be thrown on the next call
    expect(() => manager.getSession()).toThrow(NoSessionException);
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

  it("Test idle session timeout", async () => {
    const mockLastBookmark = jest.fn();
    const mockDriver = {
      session: jest.fn(() => ({ lastBookmarks: mockLastBookmark })),
      close: jest.fn(),
    } as unknown as Driver;

    // Create the pool manager with random number of sessions between 10 and 30
    const numberOfSessions = Math.floor(Math.random() * 20) + 10;

    // Create the pool manager
    const manager = new SessionPoolManager({
      neo4jDriver: mockDriver,
      numberOfSessions,
      idleTimeoutMs: 1000, // 1 second
    });

    // Get the session
    const sessionFromPool = manager.getSession();
    const { session, done } = sessionFromPool;

    // Wait for 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Must throw an error due to the session being closed
    expect(() => session.lastBookmarks()).toThrow();
    expect(done()).toEqual(false);
  });

  it("Test the idle session timeout extension", async () => {
    const mockLastBookmark = jest.fn();
    const mockDriver = {
      session: jest.fn(() => ({ lastBookmarks: mockLastBookmark })),
      close: jest.fn(),
    } as unknown as Driver;

    // Create the pool manager with random number of sessions between 10 and 30
    const maxSession = Math.floor(Math.random() * 20) + 10;

    // Create the pool manager
    const manager = new SessionPoolManager({
      neo4jDriver: mockDriver,
      numberOfSessions: maxSession,
      idleTimeoutMs: 700, // 1 second
    });

    // Get the session
    const sessionFromPool = manager.getSession();
    const { session, done } = sessionFromPool;

    // Wait for 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Call the session last bookmarks to extend the idle timeout
    expect(() => session.lastBookmarks()).not.toThrow();

    // Wait for 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(() => session.lastBookmarks()).not.toThrow();

    // Wait for 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Must not throw an error due to the session being closed
    expect(() => session.lastBookmarks()).not.toThrow();

    expect(done()).toEqual(true);
  });
});
