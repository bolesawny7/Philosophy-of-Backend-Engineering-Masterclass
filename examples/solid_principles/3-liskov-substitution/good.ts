// @ts-nocheck
// GOOD: Both shapes implement a common interface correctly

interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(public width: number, public height: number) {}

  area(): number {
    return this.width * this.height;
  }
}

class Square implements Shape {
  constructor(public side: number) {}

  area(): number {
    return this.side * this.side;
  }
}

// Works correctly with any Shape
function printArea(shape: Shape) {
  console.log(shape.area());
}
