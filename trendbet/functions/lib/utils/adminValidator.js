"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.AdminValidator = void 0;
const admin = require("firebase-admin");
class AdminValidator {
  /**
     * Check if user is admin
     */
  static async isAdmin(userId) {
    try {
      const db = admin.database();
      const adminRef = db.ref(`admins/${userId}`);
      const snapshot = await adminRef.once("value");
      return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }
  /**
     * Validate admin access and throw error if not admin
     */
  static async validateAdmin(userId) {
    const isAdmin = await this.isAdmin(userId);
    if (!isAdmin) {
      throw new Error("ADMIN_ACCESS_REQUIRED");
    }
  }
}
exports.AdminValidator = AdminValidator;
// # sourceMappingURL=adminValidator.js.map
