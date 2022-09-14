import { model } from "../../../attik-sdk-js/model";
import { Schema } from "../../../attik-sdk-js/schema";

const coordinateSchema = new Schema({
  required: ["x", "y"],
  properties: {
    x: {
      bsonType: "number",
      description: "must be a double and is required",
    },
    y: {
      bsonType: "number",
      description: "must be a double and is required",
    },
  },
});

const CoordinateModel = model("Coordinate", coordinateSchema);
export default CoordinateModel;
