import {createCollection, deleteOne, find, findOne, insertOne} from "./mongoWrappers";
import { QueryType } from "./query";

export const QueryTypeToMethod: { [key: number]: Function} = {
    [QueryType.Find]: find,
    [QueryType.FindOne]: findOne,
    [QueryType.FindById]: () => {},
    [QueryType.InsertOne]: insertOne,
    [QueryType.InsertMany]: () => {},
    [QueryType.DeleteOne]: deleteOne,
    [QueryType.DeleteMany]: () => {},
    [QueryType.CreateCollection]: createCollection,
    [QueryType.DeleteCollection]: () => {},
}