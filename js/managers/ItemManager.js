import { Item } from "../entities/Item.js";

export class ItemManager {
  constructor(game) {
    this.game = game;
    this.items = [];
  }

  update(dt) {
    this.items = this.items.filter((item) => !item.collected);
    for (let item of this.items) item.update(dt);
  }

  draw(ctx) {
    for (let item of this.items) item.draw(ctx);
  }

  spawnItem(type, x, y) {
    this.items.push(new Item(this.game, type, x, y));
  }
}
