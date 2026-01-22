// @ts-nocheck
// GOOD: Each class has one responsibility

class User {
  constructor(public name: string, public email: string) {}
}

class UserRepository {
  save(user: User) {
    console.log("Saving to database...");
  }
}

class EmailService {
  send(user: User) {
    console.log("Sending email...");
  }
}

class UserValidator {
  validate(user: User): boolean {
    return user.email.includes("@");
  }
}
