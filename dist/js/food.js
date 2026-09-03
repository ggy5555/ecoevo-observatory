export class Food {
  constructor({ id, x, y, energyValue = 25 }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.energyValue = energyValue;
  }
}
