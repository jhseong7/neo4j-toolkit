export class OneshotTimer {
  private _timeout: NodeJS.Timeout | null = null;
  private _timeoutInMs: number | null = null;

  // Function to be called when the timeout is reached
  private _callback?: (() => void) | null;

  constructor(timeoutInMs?: number, callback?: () => void) {
    if (!callback) this._callback = callback;
    if (timeoutInMs) this._timeoutInMs = timeoutInMs;
  }

  public extend() {
    if (!this._callback) throw new Error("Callback is not set");
    if (!this._timeoutInMs) throw new Error("Timeout is not set");

    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(this._callback, this._timeoutInMs);
  }

  public setTimeoutMs(timeoutInMs: number) {
    this._timeoutInMs = timeoutInMs;
  }

  public setCallback(callback: () => void) {
    this._callback = callback;
  }

  public stop() {
    if (this._timeout) clearTimeout(this._timeout);
  }

  public start() {
    if (!this._callback) throw new Error("Callback is not set");
    if (!this._timeoutInMs) throw new Error("Timeout is not set");

    this._timeout = setTimeout(this._callback, this._timeoutInMs);
  }
}
