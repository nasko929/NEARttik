import {Db} from "mongodb";


export const createCollection = async (db: Db, modelName: string, queryBody: any) => {
    const querySchema = {
        validator: {
            $jsonSchema: queryBody['_jsonSchema']
        }
    }
    const response = await db.createCollection(modelName.toLowerCase(), querySchema);
    if (!response) {
        throw new Error("Failed to create collection with modelName: " + modelName);
    }
    return { message: "success" }
}

export const insertOne = async (db: Db, modelName: string, queryBody: any) => {
    const collection = db.collection(modelName.toLowerCase());

    return await collection.insertOne(queryBody);
}

export const find = async (db: Db, modelName: string, queryBody: any) => {
    const collection = db.collection(modelName.toLowerCase());

    const cursor = collection.find(queryBody);

    return await cursor.toArray();
}

export const findOne = async (db: Db, modelName: string, queryBody: any) => {
    const collection = db.collection(modelName.toLowerCase());
    return await collection.findOne(queryBody);
}

export const deleteOne = async (db: Db, modelName: string, queryBody: any) => {
    const collection = db.collection(modelName.toLowerCase());
    return await collection.deleteOne(queryBody);
}
