import { near } from "near-sdk-js";
import { Model } from "./model";
import { Query, ComplexQuery, QueryType } from "./query";

export class Database {
  private models: Model[];

  constructor(...models: Model[]) {
    this.models = models;
  }

  public connect(callback: string | null = null): void {
    const queries: Query[] = this.models.map(
      (model) =>
        new Query(model.name, QueryType.CreateCollection, model.schema, null)
    );
    const createCollections: ComplexQuery = new ComplexQuery(queries, callback);
    Database.executeQuery(createCollections);
  }

  public createCollection(model: Model, callback: string = null): void {
    Database.executeQuery(
      new Query(model.name, QueryType.CreateCollection, model.schema, callback)
    );
  }

  public deleteCollection(model: Model, callback: string = null): void {
    Database.executeQuery(
      new Query(model.name, QueryType.DeleteCollection, {}, callback)
    );
  }

  public static executeQuery(query: Query | ComplexQuery): void {
    near.log(`QUERY:${JSON.stringify(query)}`);
  }
}
