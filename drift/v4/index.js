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
  
  const colorRange = new SVG.Color(data.initialColor).to(data.finalColor);
  
  //-- initialize lines
  const lines = lib.size(yCount, (yIndex) =>
    lib.size(xCount, (xIndex) => ({
        line: el.line(),
        xPos: xIndex * xInc,
        xNoise: xIndex * xRangeInc,
        yPos: yIndex * yInc,
        yNoise: yIndex * yRangeInc
    })))
    .flat();

  //-- initialize all the lines
  lines.forEach(({ line, xPos, yPos }) => {
    line.plot(
        xPos,
        yPos,
        xPos,
        yPos
    );

    line.stroke({
        width: data.width,
        opacity: 0,
        linecap: 'round'
    });
  });
  
  const [ requestAnimationFrame, cancelAnimationFrame ] = lib.animationFrameCalls();
  
  //-- note that cancel is not supported in all cases
  //-- see https://caniuse.com/?search=animationFrame
  //-- and manual stop below
  
  if (window.currentAnimation) {
      cancelAnimationFrame(window.currentAnimation);
      window.currentAnimation = null;
  }

  //-- initialize variables in higher scope to avoid GC
  let nowMilli;
  let zX;
  let zY;
  
  let forceX;
  let forceY;
  let length;
  let mappedLength;
  let rotatedX;
  let rotatedY;
  let colorC;
  let lineObj;
  
  const renderLines = () => {
      //-- render line
      nowMilli = Date.now();
      zX = lib.timePeriod(data.timePeriod, nowMilli);
      zY = lib.timePeriod(data.timePeriod, nowMilli + data.timeOffset);
      
      for( lineObj of lines ) {
          forceX = noise.simplex3(
              lineObj.xNoise,
              lineObj.yNoise,
              zX
          );
          forceY = noise.simplex3(
              lineObj.xNoise,
              lineObj.yNoise,
              zX
          );
          
          length = ( Math.abs(forceX) + Math.abs(forceY) ) / 2;
          mappedLength = lib.mapDomain(length, [0, 1], [data.minLength, data.maxLength]);
          
          rotatedX = Math.cos(forceX * Math.PI) * mappedLength;
          rotatedY = Math.sin(forceY * Math.PI) * mappedLength;
          
          colorC = length;
          
          lineObj.line.node.setAttribute('x2', lineObj.xPos + rotatedX);
          lineObj.line.node.setAttribute('y2', lineObj.yPos + rotatedY);
          lineObj.line.node.setAttribute('stroke-opacity', colorC);
          lineObj.line.node.setAttribute('stroke', colorRange.at(colorC).toHex())
      }
      
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
  timePeriod: (period, timeMilli) => {
      return timeMilli / period;
      // return (t.getTime() % period) / period;
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
    initialColor: urlParams.get('initial-color') || urlParams.get('initial') || '#F0F',
    finalColor: urlParams.get('final-color') || urlParams.get('final') || '#0FF',
    //-- how fast or slow the period resets, simplex provides 1 cycle per period
    timePeriod: urlParams.get('time-period') || urlParams.get('period') || 10000,
    //-- how closely related the direction and length are in time
    timeOffset: 5000,
    //-- the minimum / maximum lengths of the indicators
    minLength: urlParams.get('min-length') || urlParams.get('min') || 10,
    maxLength: urlParams.get('max-length') || urlParams.get('max') || 50,
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

  const encode = (property, value) => `${property}=${encodeURIComponent(value)}`;

  console.log(`urlParameters:
* {Integer} density - number of pixels between indicators
* {Color | Hex} background - color of the background
* {Color | Hex} initial-color - minimum color the color range
* {Color | Hex} final-color - maximum color in the color range
* {Integer} time-period - number of milliseconds between simplex apex
* {Integer} min-length - minimum length of an indicator
* {Integer} max-length - maximum length of an indicator
* {Integer} width - width of the line

${window.location.href.split('?')[0]}?` +
  `${encode('density', density)}` +
  `&${encode('background',data.backgroundColor)}` +
  `&${encode('initial-color', data.initialColor)}` +
  `&${encode('final-color', data.finalColor)}` +
  `&${encode('time-period', data.timePeriod)}` +
  `&${encode('min-length', data.minLength)}` +
  `&${encode('max-length', data.maxLength)}` +
  `&${encode('line-width', data.width)}
`);

  window.onReady(0);
});
