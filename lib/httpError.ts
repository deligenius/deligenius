export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message)
    this.status = status;
    // Object.setPrototypeOf(this, new.target.prototype)
    this.name = HttpError.name;
  }
}
