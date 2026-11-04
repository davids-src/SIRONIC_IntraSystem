import { clearSession } from "../auth/store.js";

export function logoutCommand(): void {
  clearSession();
  console.log("Logged out.");
}
