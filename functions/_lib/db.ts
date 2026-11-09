export interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  salt: string;
}

export function findUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return db
    .prepare('SELECT id, username, display_name, password_hash, salt FROM users WHERE username = ?')
    .bind(username)
    .first<UserRow>();
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}
