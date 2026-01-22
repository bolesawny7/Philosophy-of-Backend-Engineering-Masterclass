// @ts-nocheck
// BAD: Square violates Rectangle's expected behavior

class Rectangle {
  constructor(public width: number, public height: number) {}

  setWidth(w: number) {
    this.width = w;
  }

  setHeight(h: number) {
    this.height = h;
  }

  area(): number {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  setWidth(w: number) {
    this.width = w;
    this.height = w; // Breaks expectation
  }

  setHeight(h: number) {
    this.width = h;
    this.height = h; // Breaks expectation
  }
}

// This function breaks with Square
function resize(rect: Rectangle) {
  rect.setWidth(5);
  rect.setHeight(10);
  console.log(rect.area()); // Expects 50, Square gives 100
}
