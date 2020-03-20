const fs = require("fs");

const maximumPrice = 100;
const maximumQuantity = 250;

const prefixes = [
    "",
    "Awesome ",
    "Mega",
];

const names = [
    "Something",
    "Chip",
    "Box",
    "Driver",
    "Pixel"
];

const suffixes = [
    "",
    "+",
    " Ultra",
    " IIIe",
    " 2.5",
    " Lite Premium"
];

function pick(array) {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}

function generateRandomName() {
    const prefix = pick(prefixes);
    const name = pick(names);
    const suffix = pick(suffixes);

    return prefix + name + suffix;
}

function generatePositions(n) {
  const positions = [];
  for (let i = 0; i < n; i++) {
    const name = generateRandomName();
    const currency = "EUR";
    const price = Math.random() * maximumPrice;
    const precision = Math.floor(Math.random() * 5);
    const quantity = (Math.random() * maximumQuantity).toFixed(precision);
    const total = price * quantity;
    positions.push({ name, price, quantity, currency, total });
  }
  return positions;
}

const positions = generatePositions(100);

const data = {
  recipient: {
    name: "Demo Mustermann",
    address: {
      street: "Vorlagenweg 1a",
      city: "00815 Templingen"
    }
  },
  positions,
  total: positions.reduce((total, position) => total + position.total, 0),
  currency: "EUR"
};

fs.writeFileSync("testdata.json", JSON.stringify(data, undefined, 2));
fs.writeFileSync("testdata.min.json", JSON.stringify(data));
