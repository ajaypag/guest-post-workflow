import type { Config } from 'drizzle-kit';

export default {
  schema: [
    './lib/db/schema.ts',
    './lib/db/accountSchema.ts',
    './lib/db/websiteSchema.ts',
    './lib/db/publisherCrmSchema.ts',
    './lib/db/orderSchema.ts',
    './lib/db/orderGroupSchema.ts',
    './lib/db/orderLineItemSchema.ts',
    './lib/db/bulkAnalysisSchema.ts',
    './lib/db/paymentSchema.ts',
    './lib/db/orderBenchmarkSchema.ts',
    './lib/db/projectOrderAssociationsSchema.ts',
    './lib/db/dataForSeoLogsSchema.ts',
  ],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 
         `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  },
} satisfies Config;