utils.svg.embed({
  debug: true,
  
  //-- width of the SVG Scene
  width: 720,
  //-- height of the SVG Scene
  height: 360,
  data: {
      //-- number of indicators along x and y axis
      xCount: 48,
      yCount: 24,
      //-- background color
      backgroundColor: '#000',
      //-- color range: 0: startingColor, 1: ending color
      initialColor: '#F0F',
      finalColor: '#0FF',
      //-- how fast or slow the period resets, simplex provides 1 cycle per period
      timePeriod: 10000,
      //-- how closely related the direction and length are in time
      timeOffset: 5000,
      //-- the minimum / maximum lengths of the indicators
      minLength: 10,
      maxLength: 50,
      //-- opacity and width of line
      width: 4,
      // opacity: 0.2, //-- not used
  },
  scripts: ['https://cdn.rawgit.com/josephg/noisejs/master/perlin.js'],
  onReady: ({ el, SVG, data, height, width, utilityFunctions: lib }) => {
      
      //-- make the background black
      el.node.setAttribute('style', `background-color: ${data.backgroundColor}`);
      
      const xCount = data.xCount;
      const yCount = data.yCount;
      
      const xRangeInc = 1 / xCount;
      const yRangeInc = 1 / yCount;
      
      const xInc = width / xCount;
      const yInc = height / yCount;
      
      const PI2 = Math.EI * 2;
      const RT2 = Math.sqrt(2);
      
      const colorRange = new SVG.Color(data.initialColor).to(data.finalColor);
      
      const lengthRange = data.maxLength - data.minLength;
      
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
      })
      
      const anim = lib.animationFrameCalls();
      
      anim.stopOtherAnimations();
      
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
          /*
          //lines.forEach(({line, xPos, yPos, xNoise, yNoise}) => {
              forceX = noise.simplex3(
                  xNoise,
                  yNoise,
                  zX
              );
              forceY = noise.simplex3(
                  xNoise,
                  yNoise,
                  zX
              );
              
              length = ( Math.abs(forceX) + Math.abs(forceY) ) / 2;
              mappedLength = lib.mapDomain(length, [0, 1], [data.minLength, data.maxLength]);
              
              rotatedX = Math.cos(forceX * Math.PI) * mappedLength;
              rotatedY = Math.sin(forceY * Math.PI) * mappedLength;
              
              colorC = length;
              
              line.node.setAttribute('x2', xPos + rotatedX);
              line.node.setAttribute('y2', yPos + rotatedY);
              line.node.setAttribute('stroke-opacity', colorC);
              line.node.setAttribute('stroke', colorRange.at(colorC).toHex())
          });
          */
          
          //-- stop the animation
          if (anim.checkAnimationsAllowed()) {
              anim.nextAnimationFrame(renderLines);
          }
      };
      
      renderLines();
  },
  utilityFunctions: {
      animationFrameCalls: utils.svg.utilityFunctions.animationFrameCalls,
      size: utils.array.size,
      mapDomain: utils.format.mapDomain,
      timePeriod: utils.format.timePeriod,
      clamp: (val, min, max) => {
          if (val < min) {
              return min;
          } else if (val > max) {
              return max;
          }
          return val;
      },
      
      plotLine: (line, xPos, yPos, forceX, forceY) => {
          line.plot(
              xPos,
              yPos,
              xPos + forceX,
              yPos + forceY
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
  }
})