// import "dotenv/config";
// import { defineConfig } from "prisma/config";
// import { PrismaPg } from "@prisma/adapter-pg";

// export default defineConfig({
//   schema: "prisma/schema.prisma",
//   migrate: {
//     adapter: () => new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
//   },
// });

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});