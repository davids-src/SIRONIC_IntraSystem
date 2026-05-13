/** Serialize Mongoose lean docs for JSON responses (ObjectId → string, Date → ISO). */
export function serializeForJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
