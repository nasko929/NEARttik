function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

var PromiseResult$1;

(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult$1 || (PromiseResult$1 = {}));

var PromiseError;

(function (PromiseError) {
  PromiseError[PromiseError["Failed"] = 0] = "Failed";
  PromiseError[PromiseError["NotReady"] = 1] = "NotReady";
})(PromiseError || (PromiseError = {}));

/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function assertNumber(n) {
  if (!Number.isSafeInteger(n)) throw new Error(`Wrong integer: ${n}`);
}

function chain(...args) {
  const wrap = (a, b) => c => a(b(c));

  const encode = Array.from(args).reverse().reduce((acc, i) => acc ? wrap(acc, i.encode) : i.encode, undefined);
  const decode = args.reduce((acc, i) => acc ? wrap(acc, i.decode) : i.decode, undefined);
  return {
    encode,
    decode
  };
}

function alphabet(alphabet) {
  return {
    encode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('alphabet.encode input should be an array of numbers');
      return digits.map(i => {
        assertNumber(i);
        if (i < 0 || i >= alphabet.length) throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
        return alphabet[i];
      });
    },
    decode: input => {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('alphabet.decode input should be array of strings');
      return input.map(letter => {
        if (typeof letter !== 'string') throw new Error(`alphabet.decode: not string element=${letter}`);
        const index = alphabet.indexOf(letter);
        if (index === -1) throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
        return index;
      });
    }
  };
}

function join(separator = '') {
  if (typeof separator !== 'string') throw new Error('join separator should be string');
  return {
    encode: from => {
      if (!Array.isArray(from) || from.length && typeof from[0] !== 'string') throw new Error('join.encode input should be array of strings');

      for (let i of from) if (typeof i !== 'string') throw new Error(`join.encode: non-string input=${i}`);

      return from.join(separator);
    },
    decode: to => {
      if (typeof to !== 'string') throw new Error('join.decode input should be string');
      return to.split(separator);
    }
  };
}

function padding(bits, chr = '=') {
  assertNumber(bits);
  if (typeof chr !== 'string') throw new Error('padding chr should be string');
  return {
    encode(data) {
      if (!Array.isArray(data) || data.length && typeof data[0] !== 'string') throw new Error('padding.encode input should be array of strings');

      for (let i of data) if (typeof i !== 'string') throw new Error(`padding.encode: non-string input=${i}`);

      while (data.length * bits % 8) data.push(chr);

      return data;
    },

    decode(input) {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('padding.encode input should be array of strings');

      for (let i of input) if (typeof i !== 'string') throw new Error(`padding.decode: non-string input=${i}`);

      let end = input.length;
      if (end * bits % 8) throw new Error('Invalid padding: string should have whole number of bytes');

      for (; end > 0 && input[end - 1] === chr; end--) {
        if (!((end - 1) * bits % 8)) throw new Error('Invalid padding: string has too much padding');
      }

      return input.slice(0, end);
    }

  };
}

function normalize(fn) {
  if (typeof fn !== 'function') throw new Error('normalize fn should be function');
  return {
    encode: from => from,
    decode: to => fn(to)
  };
}

function convertRadix(data, from, to) {
  if (from < 2) throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
  if (to < 2) throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
  if (!Array.isArray(data)) throw new Error('convertRadix: data should be array');
  if (!data.length) return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data);
  digits.forEach(d => {
    assertNumber(d);
    if (d < 0 || d >= from) throw new Error(`Wrong integer: ${d}`);
  });

  while (true) {
    let carry = 0;
    let done = true;

    for (let i = pos; i < digits.length; i++) {
      const digit = digits[i];
      const digitBase = from * carry + digit;

      if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
        throw new Error('convertRadix: carry overflow');
      }

      carry = digitBase % to;
      digits[i] = Math.floor(digitBase / to);
      if (!Number.isSafeInteger(digits[i]) || digits[i] * to + carry !== digitBase) throw new Error('convertRadix: carry overflow');
      if (!done) continue;else if (!digits[i]) pos = i;else done = false;
    }

    res.push(carry);
    if (done) break;
  }

  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);

  return res.reverse();
}

const gcd = (a, b) => !b ? a : gcd(b, a % b);

const radix2carry = (from, to) => from + (to - gcd(from, to));

function convertRadix2(data, from, to, padding) {
  if (!Array.isArray(data)) throw new Error('convertRadix2: data should be array');
  if (from <= 0 || from > 32) throw new Error(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32) throw new Error(`convertRadix2: wrong to=${to}`);

  if (radix2carry(from, to) > 32) {
    throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
  }

  let carry = 0;
  let pos = 0;
  const mask = 2 ** to - 1;
  const res = [];

  for (const n of data) {
    assertNumber(n);
    if (n >= 2 ** from) throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = carry << from | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;

    for (; pos >= to; pos -= to) res.push((carry >> pos - to & mask) >>> 0);

    carry &= 2 ** pos - 1;
  }

  carry = carry << to - pos & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry >>> 0);
  return res;
}

function radix(num) {
  assertNumber(num);
  return {
    encode: bytes => {
      if (!(bytes instanceof Uint8Array)) throw new Error('radix.encode input should be Uint8Array');
      return convertRadix(Array.from(bytes), 2 ** 8, num);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix.decode input should be array of strings');
      return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
    }
  };
}

function radix2(bits, revPadding = false) {
  assertNumber(bits);
  if (bits <= 0 || bits > 32) throw new Error('radix2: bits should be in (0..32]');
  if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32) throw new Error('radix2: carry overflow');
  return {
    encode: bytes => {
      if (!(bytes instanceof Uint8Array)) throw new Error('radix2.encode input should be Uint8Array');
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix2.decode input should be array of strings');
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    }
  };
}

function unsafeWrapper(fn) {
  if (typeof fn !== 'function') throw new Error('unsafeWrapper fn should be function');
  return function (...args) {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}
const base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
const base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize(s => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
const base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
const base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));

const genBase58 = abc => chain(radix(58), alphabet(abc), join(''));

const base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const base58xmr = {
  encode(data) {
    let res = '';

    for (let i = 0; i < data.length; i += 8) {
      const block = data.subarray(i, i + 8);
      res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
    }

    return res;
  },

  decode(str) {
    let res = [];

    for (let i = 0; i < str.length; i += 11) {
      const slice = str.slice(i, i + 11);
      const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
      const block = base58.decode(slice);

      for (let j = 0; j < block.length - blockLen; j++) {
        if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
      }

      res = res.concat(Array.from(block.slice(block.length - blockLen)));
    }

    return Uint8Array.from(res);
  }

};
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(pre) {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;

  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if ((b >> i & 1) === 1) chk ^= POLYMOD_GENERATORS[i];
  }

  return chk;
}

function bechChecksum(prefix, words, encodingConst = 1) {
  const len = prefix.length;
  let chk = 1;

  for (let i = 0; i < len; i++) {
    const c = prefix.charCodeAt(i);
    if (c < 33 || c > 126) throw new Error(`Invalid prefix (${prefix})`);
    chk = bech32Polymod(chk) ^ c >> 5;
  }

  chk = bech32Polymod(chk);

  for (let i = 0; i < len; i++) chk = bech32Polymod(chk) ^ prefix.charCodeAt(i) & 0x1f;

  for (let v of words) chk = bech32Polymod(chk) ^ v;

  for (let i = 0; i < 6; i++) chk = bech32Polymod(chk);

  chk ^= encodingConst;
  return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}

function genBech32(encoding) {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;

  const _words = radix2(5);

  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);

  function encode(prefix, words, limit = 90) {
    if (typeof prefix !== 'string') throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
    if (!Array.isArray(words) || words.length && typeof words[0] !== 'number') throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
    const actualLength = prefix.length + 7 + words.length;
    if (limit !== false && actualLength > limit) throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    prefix = prefix.toLowerCase();
    return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
  }

  function decode(str, limit = 90) {
    if (typeof str !== 'string') throw new Error(`bech32.decode input should be string, not ${typeof str}`);
    if (str.length < 8 || limit !== false && str.length > limit) throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase()) throw new Error(`String must be lowercase or uppercase`);
    str = lowered;
    const sepIndex = str.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1) throw new Error(`Letter "1" must be present between prefix and data only`);
    const prefix = str.slice(0, sepIndex);

    const _words = str.slice(sepIndex + 1);

    if (_words.length < 6) throw new Error('Data must be at least 6 characters long');
    const words = BECH_ALPHABET.decode(_words).slice(0, -6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!_words.endsWith(sum)) throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
    return {
      prefix,
      words
    };
  }

  const decodeUnsafe = unsafeWrapper(decode);

  function decodeToBytes(str) {
    const {
      prefix,
      words
    } = decode(str, false);
    return {
      prefix,
      words,
      bytes: fromWords(words)
    };
  }

  return {
    encode,
    decode,
    decodeToBytes,
    decodeUnsafe,
    fromWords,
    fromWordsUnsafe,
    toWords
  };
}

genBech32('bech32');
genBech32('bech32m');
const utf8 = {
  encode: data => new TextDecoder().decode(data),
  decode: str => new TextEncoder().encode(str)
};
const hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize(s => {
  if (typeof s !== 'string' || s.length % 2) throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
  return s.toLowerCase();
}));
const CODERS = {
  utf8,
  hex,
  base16,
  base32,
  base64,
  base64url,
  base58,
  base58xmr
};
`Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;

var CurveType;

(function (CurveType) {
  CurveType[CurveType["ED25519"] = 0] = "ED25519";
  CurveType[CurveType["SECP256K1"] = 1] = "SECP256K1";
})(CurveType || (CurveType = {}));

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
function log$1(...params) {
  env.log(`${params.map(x => x === undefined ? 'undefined' : x) // Stringify undefined
  .map(x => typeof x === 'object' ? JSON.stringify(x) : x) // Convert Objects to strings
  .join(' ')}` // Convert to string
  );
}
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return env.read_register(0);
}
function attachedDeposit() {
  return env.attached_deposit();
}
function storageRead(key) {
  let ret = env.storage_read(key, 0);

  if (ret === 1n) {
    return env.read_register(0);
  } else {
    return null;
  }
}
function currentAccountId() {
  env.current_account_id(0);
  return env.read_register(0);
}
function input() {
  env.input(0);
  return env.read_register(0);
}
function storageWrite(key, value) {
  let exist = env.storage_write(key, value, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}

function initialize({}) {
  return function (target, key, descriptor) {};
}
function call({
  privateFunction = false,
  payableFunction = false
}) {
  return function (target, key, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      if (privateFunction && predecessorAccountId() !== currentAccountId()) {
        throw Error("Function is private");
      }

      if (!payableFunction && attachedDeposit() > BigInt(0)) {
        throw Error("Function is not payable");
      }

      return originalMethod.apply(this, args);
    };
  };
}
function NearBindgen({
  requireInit = false
}) {
  return target => {
    return class extends target {
      static _create() {
        return new target();
      }

      static _getState() {
        const rawState = storageRead("STATE");
        return rawState ? this._deserialize(rawState) : null;
      }

      static _saveToStorage(obj) {
        storageWrite("STATE", this._serialize(obj));
      }

      static _getArgs() {
        return JSON.parse(input() || "{}");
      }

      static _serialize(value) {
        return JSON.stringify(value);
      }

      static _deserialize(value) {
        return JSON.parse(value);
      }

      static _reconstruct(classObject, plainObject) {
        for (const item in classObject) {
          if (classObject[item].constructor?.deserialize !== undefined) {
            classObject[item] = classObject[item].constructor.deserialize(plainObject[item]);
          } else {
            classObject[item] = plainObject[item];
          }
        }

        return classObject;
      }

      static _requireInit() {
        return requireInit;
      }

    };
  };
}

function log(...params) {
  env.log(`${params.map(x => x === undefined ? 'undefined' : x) // Stringify undefined
  .map(x => typeof x === 'object' ? JSON.stringify(x) : x) // Convert Objects to strings
  .join(' ')}` // Convert to string
  );
}
var PromiseResult;

(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));

let QueryType;

(function (QueryType) {
  QueryType[QueryType["Find"] = 0] = "Find";
  QueryType[QueryType["FindOne"] = 1] = "FindOne";
  QueryType[QueryType["FindById"] = 2] = "FindById";
  QueryType[QueryType["InsertOne"] = 3] = "InsertOne";
  QueryType[QueryType["InsertMany"] = 4] = "InsertMany";
  QueryType[QueryType["DeleteOne"] = 5] = "DeleteOne";
  QueryType[QueryType["DeleteMany"] = 6] = "DeleteMany";
  QueryType[QueryType["CreateCollection"] = 7] = "CreateCollection";
  QueryType[QueryType["DeleteCollection"] = 8] = "DeleteCollection";
})(QueryType || (QueryType = {}));

class ComplexQuery {
  constructor(queries, callback) {
    this._queries = queries;
    this._callback = callback;
  }

  get queries() {
    return this._queries;
  }

  get callback() {
    return this._callback;
  }

}
class Query {
  constructor(modelName, queryType, queryBody, callback) {
    this._modelName = modelName;
    this._queryType = queryType;
    this._queryBody = queryBody;
    this._callback = callback;
  }

  get modelName() {
    return this._modelName;
  }

  get queryType() {
    return this._queryType;
  }

  get queryBody() {
    return this._queryBody;
  }

  get callback() {
    return this._callback;
  }

}

class Database {
  constructor(...models) {
    this.models = models;
  }

  connect(callback = null) {
    const queries = this.models.map(model => new Query(model.name, QueryType.CreateCollection, model.schema, null));
    const createCollections = new ComplexQuery(queries, callback);
    Database.executeQuery(createCollections);
  }

  createCollection(model, callback = null) {
    Database.executeQuery(new Query(model.name, QueryType.CreateCollection, model.schema, callback));
  }

  deleteCollection(model, callback = null) {
    Database.executeQuery(new Query(model.name, QueryType.DeleteCollection, {}, callback));
  }

  static executeQuery(query) {
    log(`QUERY:${JSON.stringify(query)}`);
  }

}

class Coordinate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

}

function model(name, schema) {
  let model = new Model(name, schema);
  return model;
}
class Model {
  constructor(name, schema) {
    this._name = name;
    this._schema = schema;
  }

  get name() {
    return this._name;
  }

  get schema() {
    return this._schema;
  }

  save(value, callback) {
    Database.executeQuery(new Query(this.name, QueryType.InsertOne, value, callback));
  }

  buildSaveQuery(value) {
    return new Query(this.name, QueryType.InsertOne, value, null);
  }

  findOne(conditions, callback) {
    Database.executeQuery(new Query(this.name, QueryType.FindOne, conditions, callback));
  }

  buildFindOneQuery(conditions) {
    return new Query(this.name, QueryType.FindOne, conditions, null);
  }

  deleteOne(conditions, callback) {
    Database.executeQuery(new Query(this.name, QueryType.DeleteOne, conditions, callback));
  }

  buildDeleteOneQuery(conditions) {
    return new Query(this.name, QueryType.DeleteOne, conditions, null);
  }

}

class Schema {
  get jsonSchema() {
    return this._jsonSchema;
  }

  constructor(jsonSchema) {
    this._jsonSchema = jsonSchema;
  }

}

const coordinateSchema = new Schema({
  required: ["x", "y"],
  properties: {
    x: {
      bsonType: "number",
      description: "must be a double and is required"
    },
    y: {
      bsonType: "number",
      description: "must be a double and is required"
    }
  }
});
const CoordinateModel = model("Coordinate", coordinateSchema);

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _class, _class2;
let HelloNear = (_dec = NearBindgen({}), _dec2 = initialize({}), _dec3 = call({}), _dec4 = call({}), _dec5 = call({}), _dec6 = call({}), _dec7 = call({}), _dec8 = call({}), _dec(_class = (_class2 = class HelloNear {
  init() {
    const db = new Database(CoordinateModel);
    db.connect();
  }

  find({
    conditions
  }) {
    // Find coordinate
    CoordinateModel.findOne(conditions, "coordinateFound");
  }

  save({
    coordinates
  }) {
    // Save coordinate
    let c = new Coordinate(coordinates["x"], coordinates["y"]);
    CoordinateModel.save(c, "coordinateSaved");
  }

  complexQuery() {
    // Complex query
    let query = new ComplexQuery([CoordinateModel.buildSaveQuery({
      x: 1,
      y: 3
    }), CoordinateModel.buildFindOneQuery({
      x: 1,
      y: {
        $lt: 2
      }
    })], "complexCallback");
    Database.executeQuery(query);
  }

  coordinateSaved({
    response
  }) {
    log$1(`DATA_RECEIVED:${JSON.stringify(response)}`);
  }

  coordinateFound({
    response
  }) {
    log$1(`DATA_RECEIVED:${JSON.stringify(response)}`);
  }

  complexCallback({
    response
  }) {
    log$1(`DATA_RECEIVED:${JSON.stringify(response)}`);
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "init", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "init"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "find", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "find"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "save", [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "save"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "complexQuery", [_dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "complexQuery"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "coordinateSaved", [_dec6], Object.getOwnPropertyDescriptor(_class2.prototype, "coordinateSaved"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "coordinateFound", [_dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "coordinateFound"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "complexCallback", [_dec8], Object.getOwnPropertyDescriptor(_class2.prototype, "complexCallback"), _class2.prototype)), _class2)) || _class);
function complexCallback() {
  let _state = HelloNear._getState();

  if (!_state && HelloNear._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = HelloNear._create();

  if (_state) {
    HelloNear._reconstruct(_contract, _state);
  }

  let _args = HelloNear._getArgs();

  let _result = _contract.complexCallback(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}
function coordinateFound() {
  let _state = HelloNear._getState();

  if (!_state && HelloNear._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = HelloNear._create();

  if (_state) {
    HelloNear._reconstruct(_contract, _state);
  }

  let _args = HelloNear._getArgs();

  let _result = _contract.coordinateFound(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}
function coordinateSaved() {
  let _state = HelloNear._getState();

  if (!_state && HelloNear._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = HelloNear._create();

  if (_state) {
    HelloNear._reconstruct(_contract, _state);
  }

  let _args = HelloNear._getArgs();

  let _result = _contract.coordinateSaved(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}
function complexQuery() {
  let _state = HelloNear._getState();

  if (!_state && HelloNear._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = HelloNear._create();

  if (_state) {
    HelloNear._reconstruct(_contract, _state);
  }

  let _args = HelloNear._getArgs();

  let _result = _contract.complexQuery(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}
function save() {
  let _state = HelloNear._getState();

  if (!_state && HelloNear._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = HelloNear._create();

  if (_state) {
    HelloNear._reconstruct(_contract, _state);
  }

  let _args = HelloNear._getArgs();

  let _result = _contract.save(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}
function find() {
  let _state = HelloNear._getState();

  if (!_state && HelloNear._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = HelloNear._create();

  if (_state) {
    HelloNear._reconstruct(_contract, _state);
  }

  let _args = HelloNear._getArgs();

  let _result = _contract.find(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}
function init() {
  let _state = HelloNear._getState();

  if (_state) throw new Error("Contract already initialized");

  let _contract = HelloNear._create();

  let _args = HelloNear._getArgs();

  let _result = _contract.init(_args);

  HelloNear._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(HelloNear._serialize(_result));
}

export { complexCallback, complexQuery, coordinateFound, coordinateSaved, find, init, save };
//# sourceMappingURL=hello_near.js.map
