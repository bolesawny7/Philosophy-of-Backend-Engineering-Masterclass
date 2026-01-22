// @ts-nocheck
// BAD: High-level module depends on low-level module

class MySQLDatabase {
  save(data: string) {
    console.log("Saving to MySQL");
  }
}

class UserService {
  private db = new MySQLDatabase(); // Direct dependency

  createUser(name: string) {
    this.db.save(name);
  }
}
