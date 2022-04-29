window.onReady = function onReady() {
  const {
    el,
    ctx,
    utilityFunctions: lib,
    data,
    SVG
  } = window.context;

  const width = window.innerWidth;
  const height = window.innerHeight;

  //-- make the background black
  el.setAttribute('style', `background-color: ${data.backgroundColor};`);
  el.width = width;
  el.height = height;

  el.setAttribute('style', `width: ${width}px; height: ${height}px;`);
  
  //-- number of indicators along x and y axis
  const xCount = Math.round(width / data.density);
  const yCount = Math.round(height / data.density);

  const rangeInc = width <= height
    ? 1 / xCount
    : 1 / yCount;
  
  const xInc = width / xCount;
  const yInc = height / yCount;

  const minMaxMatch = data.minLength === data.maxLength;
  
  const colorRange = new SVG.Color(data.initialColor).to(data.finalColor);
  
  //-- initialize lines
  const lines = lib.size(yCount, (yIndex) =>
    lib.size(xCount, (xIndex) => ({
        xPos: xIndex * xInc,
        xNoise: xIndex * rangeInc,
        yPos: yIndex * yInc,
        yNoise: yIndex * rangeInc
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

      ctx.fillStyle = data.backgroundColor;
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

  cleanColor: (colorString, defaultColor) => {
    //-- assume colorString is either rgb(r, g, b) or hex
    // https://svgjs.dev/docs/3.0/classes/#svg-color

    try {
      return new SVG.Color(colorString).toHex();
    } catch (err) {
      //-- try one more time by appending #
      try {
        return new SVG.Color('#' + colorString).toHex();        
      } catch (err) {
        console.error(`unable to parse color: ${colorString}, using default instead: ${defaultValue}`)
      }
    }
  },

  /**
   * Keep a running stopwatch, so the function is only called after millisecondsToWait.
   * 
   * If the function is requested again, restart the timer.
   * 
   * (This is called `debounce` and helpful to avoid calling it repeatedly on screen resize)
   * 
   * @param {Integer} millisecondsToWait - number of milliseconds to wait before debounce
   * @param {Function} functionToCall - the function to call when ready
   */
  debounce: function debounce(millisecondsToWait, functionToCall){
    var timer;
    return function(event){
      if(timer) clearTimeout(timer);
      timer = setTimeout(functionToCall, millisecondsToWait, event);
    };
  }
};

/**
 * Initialization for tippy tooltips
 */
window.tippySetup = function tippySetup() {
  tippy('[data-tippy-content]', {
    animation: 'fade',
    delay: [100, null],
    theme: 'light-border',
    placement: 'top'
  });
};

/**
 * Initialize from the GET Parameters sent.
 */
SVG.on(document, 'DOMContentLoaded', function() {

  const el = document.querySelector('#target');

  const ctx = el.getContext('2d');

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const data = {
    //-- number of pixels between indicators
    density: urlParams.get('density') || 20,
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
    width: urlParams.get('width') || urlParams.get('line-width') || 10
  };

  //-- clean the values someone has sent
  data.density = Number.parseInt(data.density);
  data.timePeriod = Number.parseInt(data.timePeriod);
  data.timeOffset = Number.parseInt(data.timeOffset);
  data.minLength = Number.parseInt(data.minLength);
  data.maxLength = Number.parseInt(data.maxLength);
  data.width = Number.parseInt(data.width);

  data.backgroundColor = utilityFunctions.cleanColor(data.backgroundColor);
  data.initialColor =    utilityFunctions.cleanColor(data.initialColor);
  data.finalColor =      utilityFunctions.cleanColor(data.finalColor);

  if (typeof data.timeOffset === 'string') {
    data.timeOffset = Number.parseInt(data.timeOffset);
  }

  window.context = {
    el,
    ctx,
    utilityFunctions,
    data,
    SVG
  };

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
  `${encode('density', data.density)}` +
  `&${encode('background',data.backgroundColor)}` +
  `&${encode('initial-color', data.initialColor)}` +
  `&${encode('final-color', data.finalColor)}` +
  `&${encode('time-period', data.timePeriod)}` +
  `&${encode('min-length', data.minLength)}` +
  `&${encode('max-length', data.maxLength)}` +
  `&${encode('line-width', data.width)}
`);

  const form = document.querySelector('nav.sidebar > div.content > form');
  const initializeInput = (form, inputName, value) => {
    const input = form.querySelector(`input[name="${inputName}"]`);
    if (input) {
      input.value = value;
    }
  }

  initializeInput(form, 'width', data.width);
  initializeInput(form, 'density', data.density);
  initializeInput(form, 'min', data.minLength);
  initializeInput(form, 'max', data.maxLength);
  initializeInput(form, 'background', data.backgroundColor);
  initializeInput(form, 'initial', data.initialColor);
  initializeInput(form, 'final', data.finalColor);
  initializeInput(form, 'period', data.timePeriod);
  initializeInput(form, 'offset', data.timeOffset);

  window.onReady(0);
  window.tippySetup();
});

/**
 * Toggle the sidebar on click
 */
function toggleSidebar() {
  const content = document.querySelector('nav.sidebar > div.content');

  const isOpen = content && content.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
      content.setAttribute('style', 'width: 0px');
      content.setAttribute('aria-expanded', false);
  } else {
      content.setAttribute('style', 'width: 250px');
      content.setAttribute('aria-expanded', true);
  }
  false;
}

/**
 * If resizing, wait x milliseconds, before trying to adjust the size again
 */
window.addEventListener('resize', utilityFunctions.debounce(500, () => {
  window.onReady(0);
}));
