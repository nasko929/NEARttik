export class Schema { 
    private _jsonSchema: object; 

    public get jsonSchema(): object {
        return this._jsonSchema;
    }

    constructor(jsonSchema: object) {
        this._jsonSchema = jsonSchema;
    }
}