// @ts-nocheck
// GOOD: Both depend on abstraction

interface Database {
  save(data: string): void;
}

class MySQLDatabase implements Database {
  save(data: string) {
    console.log("Saving to MySQL");
  }
}

class MongoDatabase implements Database {
  save(data: string) {
    console.log("Saving to MongoDB");
  }
}

class UserService {
  constructor(private db: Database) {} // Injected dependency

  createUser(name: string) {
    this.db.save(name);
  }
}

// Easy to switch or mock
const service = new UserService(new MySQLDatabase());
const serviceWithMongo = new UserService(new MongoDatabase());
