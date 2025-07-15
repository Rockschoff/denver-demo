// This file will have a post request endpoint where it will recieve a sql query and sql query will be run on snowflake and the endpoint will then return the data
import { NextResponse } from 'next/server';
import { runQueryOnSnowflake } from '@/app/api/query-data/snowflakeQueryRunner';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing SQL query' }, { status: 400 });
    }

    const result = await runQueryOnSnowflake(query);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json({ error: 'Failed to execute query' }, { status: 500 });
  }
}
