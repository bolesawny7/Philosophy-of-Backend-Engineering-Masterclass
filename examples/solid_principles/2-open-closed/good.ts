// @ts-nocheck
// GOOD: Open for extension, closed for modification

interface Discount {
  apply(price: number): number;
}

class RegularDiscount implements Discount {
  apply(price: number): number {
    return price * 0.9;
  }
}

class PremiumDiscount implements Discount {
  apply(price: number): number {
    return price * 0.8;
  }
}

// Adding new discount - no modification needed
class HolidayDiscount implements Discount {
  apply(price: number): number {
    return price * 0.5;
  }
}

class DiscountCalculator {
  calculate(discount: Discount, price: number): number {
    return discount.apply(price);
  }
}
