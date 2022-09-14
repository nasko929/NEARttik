export class Coordinate { // Extends the abstraction
    private _x: number;
    private _y: number;

    public get y(): number {
      return this._y;
    }

    public get x(): number {
      return this._x;
    }

    constructor (x: number, y: number) {
      this._x = x;
      this._y = y;
    }
  }