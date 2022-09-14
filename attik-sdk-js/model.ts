import { near } from 'near-sdk-js'
import { Database } from './database';
import { Query, QueryCallback, QueryType } from './query';
import { Schema } from './schema';

export function model(name: string, schema: Schema) : Model {
    let model: Model = new Model(name, schema);

    return model;
}

export class Model { 
    private _name: string; 
    private _schema: Schema;

    constructor(name: string, schema: Schema) {
        this._name = name;
        this._schema = schema;
    }

    public get name(): string {
        return this._name;
    }

    public get schema(): Schema {
        return this._schema;
    }

    public save(value: object, callback: QueryCallback): void {
        Database.executeQuery(new Query(this.name, QueryType.InsertOne, value, callback));
    }

    public buildSaveQuery(value: object): Query {
        return new Query(this.name, QueryType.InsertOne, value, null);
    }

    public findOne(conditions: object, callback: QueryCallback): void {
        Database.executeQuery(new Query(this.name, QueryType.FindOne, conditions, callback));
    }

    public buildFindOneQuery(conditions: object): Query {
        return new Query(this.name, QueryType.FindOne, conditions, null);
    }

    public deleteOne(conditions: object, callback: QueryCallback): void {
        Database.executeQuery(new Query(this.name, QueryType.DeleteOne, conditions, callback));
    }

    public buildDeleteOneQuery(conditions: object): Query {
        return new Query(this.name, QueryType.DeleteOne, conditions, null);
    }
}