# Seed Script Instructions

To run the seed script and populate the database with default permissions, roles, and the admin user, you need to add the following configuration to your `package.json` file.

1. Open `package.json` in the root of the project.
2. Add the `prisma` key at the top level of the JSON object (e.g., just above dependencies):

```json
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  },
```

3. If you don't have `tsx` installed, you may need to install it as a dev dependency:
```bash
npm install -D tsx
```
or 
```bash
npm install -D ts-node
```
(Adjust the seed script runner accordingly if using `ts-node`).

4. Then you can run the seed script using:
```bash
npx prisma db seed
```
