import { defineSchema, getModel, ts } from "@crm/shared";

const platformUserSchema = defineSchema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email_verified_at: { type: Date, default: null },
    display_name: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "disabled", "locked"],
      required: true,
      default: "active",
    },
    /** null when the account is passkey-only */
    password_hash: { type: String, default: null },
    failed_login_count: { type: Number, required: true, default: 0 },
    locked_until: { type: Date, default: null },
    totp: {
      enabled: { type: Boolean, required: true, default: false },
      encrypted_secret: { type: String, default: null },
      confirmed_at: { type: Date, default: null },
    },
    recovery_codes_hashes: { type: [String], default: [] },
    magic_token_hash: { type: String, default: null, index: true, sparse: true },
    magic_token_expires: { type: Date, default: null },
    reset_token_hash: { type: String, default: null, index: true, sparse: true },
    reset_token_expires: { type: Date, default: null },
  },
  ts,
);

export const PlatformUserModel = getModel("PlatformUser", platformUserSchema);
