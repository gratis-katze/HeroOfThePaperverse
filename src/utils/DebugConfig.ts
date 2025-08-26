// Performance debugging configuration
export class DebugConfig {
  private static _enableConsoleLogging = false
  
  public static get enableConsoleLogging(): boolean {
    return this._enableConsoleLogging
  }
  
  public static setConsoleLogging(enabled: boolean): void {
    this._enableConsoleLogging = enabled
  }
  
  public static log(...args: any[]): void {
    if (this._enableConsoleLogging) {
      console.log(...args)
    }
  }
  
  public static warn(...args: any[]): void {
    if (this._enableConsoleLogging) {
      console.warn(...args)
    }
  }
  
  public static error(...args: any[]): void {
    if (this._enableConsoleLogging) {
      console.error(...args)
    }
  }
}