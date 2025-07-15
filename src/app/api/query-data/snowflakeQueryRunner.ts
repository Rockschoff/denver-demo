/* eslint-disable @typescript-eslint/no-explicit-any */
import snowflake from 'snowflake-sdk';

export async function runQueryOnSnowflake(
  query: string,
  db?: string,
  schema?: string
): Promise<any[]> {
  // Ensure required environment variables are set
  const account = process.env.SNOWFLAKE_ACCOUNT!;
  const username = process.env.SNOWFLAKE_USERNAME!;
  const password = process.env.SNOWFLAKE_PASSWORD!;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE!;
  const database = db || process.env.SNOWFLAKE_DATABASE!;
  const schemaName = schema || process.env.SNOWFLAKE_SCHEMA!;

  if (!account || !username || !password || !warehouse  || !database || !schemaName) {
    throw new Error('❌ Missing one or more required Snowflake environment variables.');
  }

  snowflake.configure({
    logLevel: 'OFF',
  });

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account,
      username,
      password,
      warehouse,
      database,
      schema: schemaName,
    });

    connection.connect((err) => {
      if (err) {
        console.error('❌ Snowflake connection error:', err);
        return reject(new Error('Failed to connect to Snowflake.'));
      }

      connection.execute({
        sqlText: query,
        complete: (err, _stmt, rows) => {
          if (err) {
            console.error('❌ Snowflake query error:', err.message);
            connection.destroy(() => {}); // Required callback
            return reject(new Error('Failed to execute Snowflake query.'));
          }

          const serialized = (rows || []).map((row: any) => {
            const result: Record<string, any> = {};
            for (const key in row) {
              const value = row[key];
              result[key] =
                value instanceof Date
                  ? value.toISOString()
                  : value;
            }
            return result;
          });

          connection.destroy(() => {}); // Clean up with no-op callback
          resolve(serialized);
        },
      });
    });
  });
}
