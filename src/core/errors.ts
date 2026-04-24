export class MathParseError extends Error {
  public position: number;
  public input: string;

  constructor(message: string, position: number, input: string) {
    super(message);
    this.name = "MathParseError";
    this.position = position;
    this.input = input;
  }
}
