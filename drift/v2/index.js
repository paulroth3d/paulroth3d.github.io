window.onReady = function onReady() {
  const {
    el,
    width,
    height,
    utilityFunctions: lib,
    data,
    SVG
  } = window.context;
  
  const xCount = data.xCount;
  const yCount = data.yCount;
  
  const xRangeInc = 1 / xCount;
  const yRangeInc = 1 / yCount;
  
  const xInc = width / xCount;
  const yInc = height / yCount;
  
  const PI2 = Math.EI * 2;
  const RT2 = Math.sqrt(2);
  
  const colorRange = new SVG.Color(
    lib.cleanColor(data.initialColor)
  ).to(
    lib.cleanColor(data.finalColor)
  );
  
  //-- initialize lines
  const lines = lib.size(yCount)
      .map(() => lib.size(xCount, () => el.line()));
  
  const [ requestAnimationFrame, cancelAnimationFrame ] = lib.animationFrameCalls();
  
  //-- note that cancel is not supported in all cases
  //-- see https://caniuse.com/?search=animationFrame
  //-- and manual stop below
  
  if (window.currentAnimation) {
      cancelAnimationFrame(window.currentAnimation);
      window.currentAnimation = null;
  }
  
  const renderLines = () => {
      //-- render line
      let zX = lib.mapTime(new Date().getTime(), data.timePeriod);
      let zY = lib.mapTime(new Date().getTime() + data.timeOffset, data.timePeriod);
      lines.forEach((row, rowIndex) => {
          row.forEach((line, colIndex) => {
              const forceX = noise.simplex3(
                  colIndex * xRangeInc,
                  rowIndex * yRangeInc,
                  zX
              );
              const forceY = noise.simplex3(
                  colIndex * xRangeInc,
                  rowIndex * yRangeInc,
                  zY
              );
              // const length = Math.sqrt(forceX * forceX + forceY * forceY);
              const length = ( Math.abs(forceX) + Math.abs(forceY) ) / 2;
              const mappedLength = lib.mapDomain(length, [0, 1], [data.minLength, data.maxLength]);
              
              const rotatedX = Math.cos(forceX * Math.PI) * mappedLength;
              const rotatedY = Math.sin(forceY * Math.PI) * mappedLength;
              
              lib.plotLine(line, xInc, yInc, colIndex, rowIndex, rotatedX, rotatedY);

              const colorC = length; // lib.mapDomain(length, [0, 1], [0, 1]);
              
              lib.styleLine(line, colorRange, colorC, data.width, colorC);
          })
      });
      
      //-- stop the animation
      if (window.stopAnimation == true) {
          console.log('animation noticed stop');
          window.currentAnimation = null;
      } else {
          window.currentAnimation = requestAnimationFrame(renderLines);
      }
  };
  renderLines();
};

window.utilityFunctions = {
  animationFrameCalls: () => {
      const requestAnimationFrame = window.requestAnimationFrame
          || window.mozRequestAnimationFrame
          || window.webkitRequestAnimationFrame
          || window.msRequestAnimationFrame;
      const cancelAnimationFrame = window.cancelAnimationFrame
          || window.mozCancelAnimationFrame;
      
      return [requestAnimationFrame, cancelAnimationFrame];
  },
  size: function size(length, defaultValue) {
    if (typeof defaultValue === 'function') {
      return new Array(length).fill(null).map((_, index) => defaultValue(index));
    }
    return  new Array(length).fill(defaultValue);
  },
  mapDomain: (val, [origMin, origMax], [newMin, newMax]) => {
      // origMin / val / origMax = newMin / result / newMax
      // (val - origMin) / (origMax - origMin) = (result - newMin) / (newMax - newMin)
      // (val - origMin) * (newMax - newMin) / (origMax - origMin) = result - newMin;
      // (val - origMin) * (newMax - newMin) / (origMax - origMin) + newMin = result
      return (val - origMin) * (newMax - newMin) / (origMax - origMin) + newMin;
  },
  mapTime: (t, period) => {
      return t / period;
      // return (t.getTime() % period) / period;
  },
  cleanColor: (colorString) => {
    //-- assume colorString is either rgb(r, g, b) or hex
    // https://svgjs.dev/docs/3.0/classes/#svg-color

    //-- for now, fail if the color is not accepted.
    // try { new SVG.Color(colorString); } ...

    return (colorString.length === 3 || colorString.length === 6)
      ? `#${colorString}`
      : colorString;
  },
  plotLine: (line, xInc, yInc, x, y, forceX, forceY) => {
      const xOff = xInc * x;
      const yOff = yInc * y;
      line.plot(
          xOff,
          yOff,
          xOff + forceX,
          yOff + forceY
      )
  },
  styleLine: (line, colorRange, c, width = 1, opacity = 1) => {
      line.stroke({
          color: colorRange.at(c).toHex(),
          width,
          opacity,
          linecap: 'round'
      });
  }
};

SVG.on(document, 'DOMContentLoaded', function() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const el = SVG().addTo('body').size(width, height);

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const density = urlParams.get('density') || 20;

  const data = {
    //-- number of indicators along x and y axis
    xCount: Math.round(width / density),
    yCount: Math.round(height / density),
    //-- background color
    backgroundColor: urlParams.get('background') || urlParams.get('background-color') || '#000',
    //-- color range: 0: startingColor, 1: ending color
    initialColor: urlParams.get('initial') ||  urlParams.get('initial-color') || 'F0F',
    finalColor: urlParams.get('final') || urlParams.get('final-color') || '0FF',
    //-- how fast or slow the period resets, simplex provides 1 cycle per period
    timePeriod: urlParams.get('period') ||  urlParams.get('time-period') || 10000,
    //-- how closely related the direction and length are in time
    timeOffset: urlParams.get('offset') ||  5000,
    //-- the minimum / maximum lengths of the indicators
    minLength: urlParams.get('min') ||  urlParams.get('min-length') || 10,
    maxLength: urlParams.get('max') ||  urlParams.get('max-length') || 50,
    //-- opacity and width of line
    width: urlParams.get('width') || urlParams.get('line-width') || 4,
    // opacity: 0.2, //-- not used
  };

  window.context = {
    el,
    width,
    height,
    utilityFunctions,
    data,
    SVG
  };

  //-- make the background black
  el.node.setAttribute('style', `background-color: ${data.backgroundColor}`);

  console.log(`urlParameters:
* {Integer} density - number of pixels between indicators
* {Color | Hex} background - color of the background
* {Color | Hex} initial-color - minimum color the color range
* {Color | Hex} final-color - maximum color in the color range
* {Integer} time-period - number of milliseconds between simplex apex
* {Integer} min-length - minimum length of an indicator
* {Integer} max-length - maximum length of an indicator
* {Integer} width - width of the lines

${window.location.href.split('?')[0]}?density=${density}&background=${data.backgroundColor}&initial-color=${data.initialColor}&final-color=${data.finalColor}&time-period=${data.timePeriod}&min-length=${data.minLength}&max-length=${data.maxLength}&line-width=${data.width}
`);

  window.onReady(0);
});
