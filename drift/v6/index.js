window.onReady = function onReady() {
  const {
    el,
    ctx,
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

  const minMaxMatch = data.minLength === data.maxLength;
  
  const colorRange = new SVG.Color(
      lib.cleanColor(data.initialColor)
    ).to(
      lib.cleanColor(data.finalColor)
    );
  
  //-- initialize lines
  const lines = lib.size(yCount, (yIndex) =>
    lib.size(xCount, (xIndex) => ({
        xPos: xIndex * xInc,
        xNoise: xIndex * xRangeInc,
        yPos: yIndex * yInc,
        yNoise: yIndex * yRangeInc
    })))
    .flat();
  
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
      const nowTime = Date.now();
      let zX     = lib.timePeriod(data.timePeriod, nowTime);
      let zY     = lib.timePeriod(data.timePeriod, nowTime + data.timeOffset);
      let zColor = lib.timePeriod(data.timePeriod, nowTime + data.timeOffset + data.timeOffset);

      ctx.fillStyle = lib.cleanColor(data.backgroundColor);
      ctx.fillRect(0, 0, width, height);

      for ( let lineObj of lines) {
        //-- [0 <= x <= 1], [0 <= y <= 1], timePeriod
        const forceX = noise.simplex3(
          lineObj.xNoise,
          lineObj.yNoise,
          zX
        );
        //-- [0 <= x <= 1], [0 <= y <= 1], timePeriod + shift
        const forceY = noise.simplex3(
          lineObj.xNoise,
          lineObj.yNoise,
          zY
        );
        //-- [0 <= x <= 1], [0 <= y <= 1], timePeriod + shift
        const noiseColor = noise.simplex3(
          lineObj.xNoise,
          lineObj.yNoise,
          zColor
        );

        //-- use shortcut to avoid Math.sqrt
        // const forceLength = Math.sqrt(forceX * forceX + forceY * forceY);
        let forceLength = ( Math.abs(forceX) + Math.abs(forceY) ) / 2;
        if (forceLength > 1) forceLength = 1;

        const mappedLength = lib.mapDomain(forceLength, [0, 1], [data.minLength, data.maxLength]);
        
        const rotatedX = Math.cos(forceX * Math.PI) * mappedLength;
        const rotatedY = Math.sin(forceY * Math.PI) * mappedLength;

        let rotatedLength = (Math.abs(rotatedX) + Math.abs(rotatedY)) / 2;

        let initialTransparency;
        if (minMaxMatch) {
          //-- we want to see full color circles / no gradient
          initialTransparency = 1;
        } else {
          //-- make the gradient appear more opaque if closer to 0
          //-- as it appears more 'overhead'
          initialTransparency = lib.mapDomain(
            rotatedLength,
            [ 0, data.minLength ],
            [ 1, 0 ]
          );
        }
        
        //-- map the color to a place on the colorRange
        const colorVal = lib.mapDomain(noiseColor, [-1, 1], [0, 1]);
        const color = colorRange.at(colorVal);
        //-- note length is used for the alpha
        // const colorStr = `rgb(${color.r},${color.g},${color.b})`;

        //-- direction of the gradient (x1, y1, x2, y2)
        //-- as it is in the center of the circle
        const gradient = ctx.createLinearGradient(
        	lineObj.xPos, lineObj.yPos,
        	lineObj.xPos + rotatedX, lineObj.yPos + rotatedY
        );
        gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${initialTransparency})`);
        gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},1)`);

				ctx.strokeStyle = gradient;
        ctx.lineWidth = data.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lineObj.xPos, lineObj.yPos);
        ctx.lineTo(lineObj.xPos + rotatedX, lineObj.yPos + rotatedY);
        // ctx.closePath();
        ctx.stroke();
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
  // see jupyter-ijavascript-utils/svg/utilityFunctions.animationFrameCalls
  // see https://jupyter-ijavascript-utils.onrender.com/module-svg_utilityFunctions.html#.animationFrameCalls
  animationFrameCalls: () => {
      const requestAnimationFrame = window.requestAnimationFrame
          || window.mozRequestAnimationFrame
          || window.webkitRequestAnimationFrame
          || window.msRequestAnimationFrame;
      const cancelAnimationFrame = window.cancelAnimationFrame
          || window.mozCancelAnimationFrame;
      
      return [requestAnimationFrame, cancelAnimationFrame];
  },
  // see jupyter-ijavascript-utils/array.size
  // https://jupyter-ijavascript-utils.onrender.com/module-array.html#.size
  size: function size(length, defaultValue) {
    if (typeof defaultValue === 'function') {
      return new Array(length).fill(null).map((_, index) => defaultValue(index));
    }
    return  new Array(length).fill(defaultValue);
  },
  // see jupyter-ijavascript-utils/format.mapDomain
  // https://jupyter-ijavascript-utils.onrender.com/module-format.html#.mapDomain
  mapDomain: (val, [origMin, origMax], [newMin, newMax]) => {
      // origMin / val / origMax = newMin / result / newMax
      // (val - origMin) / (origMax - origMin) = (result - newMin) / (newMax - newMin)
      // (val - origMin) * (newMax - newMin) / (origMax - origMin) = result - newMin;
      // (val - origMin) * (newMax - newMin) / (origMax - origMin) + newMin = result
      if ( val < origMin) {
        return newMin;
      } else if (val > origMax) {
        return newMax;
      }
      return (val - origMin) * (newMax - newMin) / (origMax - origMin) + newMin;
  },
  // see jupyter-ijavascript-utils/format.timePeriod
  // https://jupyter-ijavascript-utils.onrender.com/module-format.html#.timePeriod
  timePeriod: (millisecondPeriod, timeMilli) => {
      return timeMilli / millisecondPeriod;
      // return (t.getTime() % period) / period;
  },
  // see jupyter-ijavascript-utils/format.clampDomain
  // https://jupyter-ijavascript-utils.onrender.com/module-format.html#.clampDomain
  clampDomain: (value, [min, max]) => {
    if (value < min) {
      return min;
    } else if (value > max) {
      return max;
    }
    return value;
  },

  cleanColor: (colorString) => {
    //-- assume colorString is either rgb(r, g, b) or hex
    // https://svgjs.dev/docs/3.0/classes/#svg-color

    //-- for now, fail if the color is not accepted.
    // try { new SVG.Color(colorString); } ...

    return (colorString.length === 3 || colorString.length === 6)
      ? `#${colorString}`
      : colorString;
  }
};

SVG.on(document, 'DOMContentLoaded', function() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const el = document.querySelector('#target');
  el.setAttribute('style', `width: ${width}px; height: ${height}px;`);

  const ctx = el.getContext('2d');

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const density = Number.parseInt(urlParams.get('density') || 20);

  const data = {
    //-- number of indicators along x and y axis
    xCount: Math.round(width / density),
    yCount: Math.round(height / density),
    //-- background color
    backgroundColor: urlParams.get('background') || urlParams.get('background-color') || '000',
    //-- color range: 0: startingColor, 1: ending color
    initialColor: (urlParams.get('initial') || urlParams.get('initial-color') || 'F0F'),
    finalColor: (urlParams.get('final') || urlParams.get('final-color') || '0FF'),
    //-- how fast or slow the period resets, simplex provides 1 cycle per period
    timePeriod: urlParams.get('period') || urlParams.get('time-period') || 10000,
    //-- how closely related the direction and length are in time
    timeOffset: urlParams.get('offset') || 5000,
    //-- the minimum / maximum lengths of the indicators
    minLength: urlParams.get('min') || urlParams.get('min-length') || 10,
    maxLength: urlParams.get('max') || urlParams.get('max-length') || 100,
    //-- opacity and width of line
    width: urlParams.get('width') || urlParams.get('line-width') || 10,
    minWidth: urlParams.get('min-width') || 20
  };

  data.timePeriod = Number.parseInt(data.timePeriod);
  data.timeOffset = Number.parseInt(data.timeOffset);
  data.minLength = Number.parseInt(data.minLength);
  data.maxLength = Number.parseInt(data.maxLength);
  data.width = Number.parseInt(data.width);
  data.minWidth = Number.parseInt(data.minWidth);

  if (typeof data.timeOffset === 'string') {
    data.timeOffset = Number.parseInt(data.timeOffset);
  }

  window.context = {
    el,
    ctx,
    width,
    height,
    utilityFunctions,
    data,
    SVG
  };

  //-- make the background black
  el.setAttribute('style', `background-color: ${data.backgroundColor};`);
  el.width = width;
  el.height = height;

  const encode = (property, value) => `${property}=${encodeURIComponent(value)}`;

  console.log(`
Simplex Noise visualization
see here for more: (and how you can run your own)
https://jupyter-ijavascript-utils.onrender.com/tutorial-noiseVisualization.html

  urlParameters:
* {Integer} density - number of pixels between indicators
* {Color | Hex} background - color of the background
* {Color | Hex} initial-color - minimum color the color range
* {Color | Hex} final-color - maximum color in the color range
* {Integer} time-period - number of milliseconds between simplex apex
* {Integer} min-length - minimum length of an indicator
* {Integer} max-length - maximum length of an indicator
* {Integer} width - width of the line
* {Integer} min-width - width of line before considered 'overhead'

${window.location.href.split('?')[0]}?` +
  `${encode('density', density)}` +
  `&${encode('background',data.backgroundColor)}` +
  `&${encode('initial-color', data.initialColor)}` +
  `&${encode('final-color', data.finalColor)}` +
  `&${encode('time-period', data.timePeriod)}` +
  `&${encode('min-length', data.minLength)}` +
  `&${encode('max-length', data.maxLength)}` +
  `&${encode('line-width', data.width)}` +
  `&${encode('min-width', data.minWidth)}
`);

  window.onReady(0);
});
