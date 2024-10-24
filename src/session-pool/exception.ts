export class NoSessionException extends Error {
  constructor() {
    super("No session available");
  }
}
