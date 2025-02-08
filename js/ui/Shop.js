import { GameState, ShopItems } from "../core/constants.js";

export class Shop {
  constructor(game) {
    this.game = game;
    this.items = Object.values(ShopItems);
    this.selectedIndex = 0;
  }
  draw(ctx) {
    const width = this.game.canvas.width,
      height = this.game.canvas.height;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("상점", width / 2, 100);
    ctx.font = "24px Arial";
    ctx.fillText(`보유 젬: ${this.game.gems || 0}`, width / 2, 150);
    const startY = 200,
      itemHeight = 80;
    for (let index = 0; index < this.items.length; index++) {
      const item = this.items[index],
        y = startY + index * itemHeight;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(item.name, width / 2, y + 20);
      ctx.font = "18px Arial";
      ctx.fillText(item.description, width / 2, y + 45);
      ctx.fillStyle = "#ff0";
      ctx.fillText(`${item.cost} 젬`, width / 2, y + 70);
    }
    ctx.restore();
  }
  purchaseSelected() {
    const item = this.items[this.selectedIndex];
    if (this.game.gems >= item.cost) {
      this.game.gems -= item.cost;
      item.effect(this.game.player);
    }
  }
}