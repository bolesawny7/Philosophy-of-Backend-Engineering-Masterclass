// @ts-nocheck
// BAD: User class has multiple responsibilities

class User {
  constructor(public name: string, public email: string) {}

  save() {
    console.log("Saving to database...");
  }

  sendEmail() {
    console.log("Sending email...");
  }

  validate() {
    return this.email.includes("@");
  }
}
