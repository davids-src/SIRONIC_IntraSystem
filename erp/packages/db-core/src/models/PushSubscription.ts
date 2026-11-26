import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * A browser's Web Push subscription (desktop / phone notifications). One user may have several
 * (each browser and device subscribes on its own); the endpoint identifies one.
 */
export interface IPushSubscription extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true, collection: "push_subscriptions" },
);

export const PushSubscription =
  (mongoose.models.PushSubscription as mongoose.Model<IPushSubscription>) ||
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

/**
 * The server's VAPID key pair for Web Push — generated once on first use and kept here, so
 * notifications work without extra configuration (env `VAPID_*` overrides it).
 */
export interface IPushConfig extends Document {
  _id: Types.ObjectId;
  key: string;
  publicKey: string;
  privateKey: string;
}

const PushConfigSchema = new Schema<IPushConfig>(
  {
    key: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    privateKey: { type: String, required: true },
  },
  { collection: "push_config" },
);

export const PushConfig =
  (mongoose.models.PushConfig as mongoose.Model<IPushConfig>) ||
  mongoose.model<IPushConfig>("PushConfig", PushConfigSchema);
