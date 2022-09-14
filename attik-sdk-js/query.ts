import { near } from "near-sdk-js";

export enum QueryType {
  Find,
  FindOne,
  FindById,
  InsertOne,
  InsertMany,
  DeleteOne,
  DeleteMany,
  CreateCollection,
  DeleteCollection,
}

export class ComplexQuery {
  private _queries: Query[];
  private _callback: string | null;

  constructor(queries: Query[], callback: string | null) {
    this._queries = queries;
    this._callback = callback;
  }

  public get queries(): Query[] {
    return this._queries;
  }

  public get callback(): string | null {
    return this._callback;
  }
}

export class Query {
  private _modelName: string;
  private _queryType: QueryType;
  private _queryBody: object;
  private _callback: string | null;

  constructor(
    modelName: string,
    queryType: QueryType,
    queryBody: object,
    callback: string | null
  ) {
    this._modelName = modelName;
    this._queryType = queryType;
    this._queryBody = queryBody;
    this._callback = callback;
  }

  public get modelName(): string {
    return this._modelName;
  }

  public get queryType(): QueryType {
    return this._queryType;
  }

  public get queryBody(): object {
    return this._queryBody;
  }

  public get callback(): string | null {
    return this._callback;
  }
}
