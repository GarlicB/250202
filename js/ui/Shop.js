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
        y = startY + index * itemHeight,
        isSelected = index === this.selectedIndex;
      if (isSelected) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(width / 4, y - 10, width / 2, itemHeight - 10);
      }
      ctx.fillStyle = isSelected ? "#4af" : "#fff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(item.name, width / 2, y + 20);
      ctx.font = "18px Arial";
      ctx.fillText(item.description, width / 2, y + 45);
      ctx.fillStyle = "#ff0";
      ctx.fillText(`${item.cost} 젬`, width / 2, y + 70);
    }
    ctx.fillStyle = "#aaa";
    ctx.font = "18px Arial";
    ctx.fillText("↑↓: 선택  SPACE: 구매  ESC: 나가기", width / 2, height - 50);
    ctx.restore();
  }

  handleInput(key) {
    switch (key) {
      case "ArrowUp":
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        break;
      case "ArrowDown":
        this.selectedIndex = Math.min(
          this.items.length - 1,
          this.selectedIndex + 1
        );
        break;
      case " ":
        this.purchaseSelected();
        break;
      case "Escape":
        this.game.state = GameState.PLAY;
        break;
    }
  }

  purchaseSelected() {
    const item = this.items[this.selectedIndex];
    if (this.game.gems >= item.cost) {
      this.game.gems -= item.cost;
      item.effect(this.game.player);
    }
  }
} 
