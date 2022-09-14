import { NearBindgen, near, call, view, initialize } from "near-sdk-js";
import { Database } from "../../../attik-sdk-js/database";
import { ComplexQuery } from "../../../attik-sdk-js/query";
import { Coordinate } from "./coordinate";
import CoordinateModel from "./CoordinateModel";

@NearBindgen({})
class HelloNear {
  @initialize({})
  init() {
    const db: Database = new Database(CoordinateModel);
    db.connect();
  }

  @call({})
  find({ conditions }: { conditions: object }) {
    // Find coordinate
    CoordinateModel.findOne(conditions, "coordinateFound");
  }

  @call({})
  save({ coordinates }: { coordinates: object }) {
    // Save coordinate
    let c: Coordinate = new Coordinate(coordinates["x"], coordinates["y"]);
    CoordinateModel.save(c, "coordinateSaved");
  }

  @call({})
  complexQuery() {
    // Complex query
    let query: ComplexQuery = new ComplexQuery(
      [
        CoordinateModel.buildSaveQuery({ x: 1, y: 3 }),
        CoordinateModel.buildFindOneQuery({ x: 1, y: { $lt: 2 } }),
      ],
      "complexCallback"
    );
    Database.executeQuery(query);
  }

  @call({})
  coordinateSaved({ response }: { response: object }): void {
    near.log(`DATA_RECEIVED:${JSON.stringify(response)}`);
  }

  @call({})
  coordinateFound({ response }: { response: object }): void {
    near.log(`DATA_RECEIVED:${JSON.stringify(response)}`);
  }

  @call({})
  complexCallback({ response }: { response: object }): void {
    near.log(`DATA_RECEIVED:${JSON.stringify(response)}`);
  }
}
