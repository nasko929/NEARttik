import express, { Express, Request, Response } from 'express';
import { MongoClient, Db } from 'mongodb';
import { QueryTypeToMethod } from './utils/utils';

const dotenv = require('dotenv');

dotenv.config();

let db: Db;

const mongoClient = new MongoClient(process.env.DATABASE_URL as any);
mongoClient.connect().then(() => {
  console.log('Connected successfully to server');
  db = mongoClient.db("MongoOnChain");
  console.log('Connected successfully to database');
})

const app: Express = express();
const port = process.env.PORT;

/** Parse the request */
app.use(express.urlencoded({ extended: false }));

/** Takes care of JSON data */
app.use(express.json());

async function processComplexQuery(complexQuery: any): Promise<any> {
  let responses = [];

  for (const query of complexQuery._queries) {
    const response = await processQuery(query);
    if (response.error) return response;

    responses.push(response);
  }

  return {
    data: responses,
    callback: complexQuery._callback
  };
}

async function processQuery(query: any): Promise<any> {
  try {
    const dbMethod = QueryTypeToMethod[query._queryType];
    const response = await dbMethod(db, query._modelName, query._queryBody);
    return { data: response, callback: query._callback};
  } catch(error: any) {
    return { error: error.message, callback: query._callback };
  }
} 

app.post('/', async (req: Request, res: Response) => {
  console.log(JSON.stringify(req.body, undefined, 4))
  const queries = req.body;

  if (!db) return res.status(500).json("Database is not connected");

  let responses: any[] = [];
  for (const query of queries) {
    if (query.hasOwnProperty('_queries')) {
      const processedComplexQuery = await processComplexQuery(query);
      console.log(processedComplexQuery)
      if (processedComplexQuery.error) return res.status(500).json(processedComplexQuery);

      responses.push(processedComplexQuery);
    } else {
      const processedQuery = await processQuery(query);
      if (processedQuery.error) return res.status(500).json(processedQuery);

      responses.push(processedQuery);
    }
  }

  return res.status(200).json(responses);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});