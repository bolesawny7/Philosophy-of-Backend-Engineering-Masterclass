// @ts-nocheck
// BAD: Fat interface forces unnecessary implementations

interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class Human implements Worker {
  work() { console.log("Working"); }
  eat() { console.log("Eating"); }
  sleep() { console.log("Sleeping"); }
}

class Robot implements Worker {
  work() { console.log("Working"); }
  eat() { throw new Error("Robots don't eat"); }
  sleep() { throw new Error("Robots don't sleep"); }
}
