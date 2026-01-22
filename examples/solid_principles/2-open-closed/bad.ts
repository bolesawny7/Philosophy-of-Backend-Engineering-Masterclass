// @ts-nocheck
// BAD: Must modify class to add new discount types

class DiscountCalculator {
  calculate(type: string, price: number): number {
    if (type === "regular") {
      return price * 0.9;
    } else if (type === "premium") {
      return price * 0.8;
    } else if (type === "vip") {
      return price * 0.7;
    }
    return price;
  }
}
