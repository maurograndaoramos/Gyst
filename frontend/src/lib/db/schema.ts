import { integer, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core"
import type { AdapterAccountType } from "next-auth/adapters"

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  username: text("username"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"), // For credentials auth
  organizationId: text("organizationId")
    .references(() => organizations.id, { onDelete: "cascade" }),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
})

export const accounts = sqliteTable("account", {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
)

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
})

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
)

export const authenticators = sqliteTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: integer("credentialBackedUp", {
      mode: "boolean",
    }).notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  ]
)

// Define organizations table first as other tables will reference it
export const organizations = sqliteTable("organization", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Assuming owner_id refers to a user
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

// Example business tables that require organization filtering
export const projects = sqliteTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // Added reference
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date()),
  createdBy: text("createdBy")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const documents = sqliteTable("document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // Added reference
  projectId: text("projectId")
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  filePath: text("filePath"),
  mimeType: text("mimeType"),
  size: integer("size"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date()),
  createdBy: text("createdBy")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId") // Assuming this should also reference users.id
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organizationId")
    .references(() => organizations.id, { onDelete: "set null" }), // Added reference, allows null
  action: text("action").$type<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'>().notNull(),
  tableName: text("tableName").notNull(),
  recordCount: integer("recordCount").notNull().default(0),
  query: text("query").notNull(),
  bypassUsed: integer("bypassUsed", { mode: "boolean" }).notNull().default(false),
  success: integer("success", { mode: "boolean" }).notNull().default(true),
  errorMessage: text("errorMessage"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull()
})