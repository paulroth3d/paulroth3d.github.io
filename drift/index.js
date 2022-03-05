class Line {
  position(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  draw(context) {
    let r = Math.sin(this.forceX) * 255;
    let g = Math.sin(this.forceY) * 255;
    const b = this._force * 255;
    r = r < 0 ? 0 : r;
    g = g < 0 ? 0 : g;
    context.strokeStyle =
      "rgba(" + r + ", " + g + ", " + b + ", " + this._force + ")";
    context.lineWidth = this._force * 7;
    context.beginPath();
    context.moveTo(this.x, this.y);
    const m = this._force * 100;
    context.lineTo(
      this.x + m * Math.sin(this.forceX),
      this.y + m * Math.cos(this.forceY)
    );
    context.closePath();
    context.stroke();
  }
  force(x, y) {
    this._force = (Math.abs(x) + Math.abs(y)) / 2;
    this.forceX = x * Math.PI;
    this.forceY = y * Math.PI;
  }
}

// main
{
  const canvas = document.querySelector("#c");
  const context = canvas.getContext("2d");
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  const lines = [];
  
  const wl = 60, // number of verticallines
    hl = 60;     // horizontal

  noise.seed(Math.random());

  for (let y = 0; y <= wl; y++) {
    for (let x = 0; x <= hl; x++) {
      lines.push(new Line().position((x * w) / wl, (y * h) / hl));
    }
  }

  let cap = v => {
    v = 1 < v ? 1 : v;
    v = v < -1 ? -1 : v;
    return v;
  };

  // console.log(lines);
  
  const enterframe = () => {
    context.fillStyle = "rgba(0, 0, 0, 1)";
    context.fillRect(0, 0, w, h);
    lines.forEach(line => {
      let forceX = noise.simplex3(
        line.x / 600, 
        line.y / 600,
        Date.now() / 7000
      );
      let forceY = noise.simplex3(
        line.x / 600,
        line.y / 600,
        Date.now() / 7000 + 100
      );

      line.force(cap(forceX), cap(forceY));
      line.draw(context);
    });
    window.requestAnimationFrame(enterframe);
  };
  window.requestAnimationFrame(enterframe);
}
