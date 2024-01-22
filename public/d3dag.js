const dashDimensions = [8, 5];
const header = 0;
const rectHeight = 50;
const rectWidth = 160;
const verticalMargin = 15;
const horizontalMargin = 35;
const offset = 28;
const horizontalDivision = 100;
const gap = 4;

function decrement_refcount_dagre(n, g, depth = 0) {

  if (path.includes(n.data.id))
  {
    console.log('Cycle detected');
    return;
  }
  path.push(n.data.id);

  for (const e of g.outEdges(n.data.id))
  {
    g.edge(e).data.hidden = true;
  }

  if (depth == 0 || n.data.active)
    for (const c of g.successors(n.data.id))
    {
      let child = g.node(c)
      if (child.data.refCount > 0) {
        --child.data.refCount;
        child.data.hidden = (child.data.refCount === 0);
        if (child.data.hidden)
        {
          for(const e of g.outEdges(c))
          {
            g.edge(e).data.hidden = true;
          }
          decrement_refcount_dagre(child, g, depth + 1);
        }
      }
    }
  path.pop();
}


function increment_refcount_dagre(n, g, depth = 0) {
  if (path.includes(n.data.id))
  {
    return;
  }
  path.push(n.data.id);

  for(const c of g.successors(n.data.id))
  {
    let child = g.node(c)
    const originalVisibility = child.data.hidden;
    ++child.data.refCount;
    child.data.hidden = (child.data.refCount === 0);

    if (originalVisibility != child.data.hidden && child.data.active) 
    {
      /* If node just popped up, propogate references to children */
      increment_refcount_dagre(child, g, depth + 1);

      /* If node just popped up, show all parent edges from nodes not hidden */
      const dagNodes = dag.nodes();
      for (const incomingEdge of g.inEdges(c))
      {
        const sourceNodeId = g.edge(incomingEdge).data.source;
        const node = g.node(dagNodes.find(node => g.node(node).data.id === sourceNodeId));
        if (!node.data.hidden && node.data.active)
        {
          g.edge(incomingEdge).data.hidden = false;
        }
      }
      
      /* If node just popped up, show all child edges to nodes not hidden */
      for (const outgoingEdge of g.outEdges(c))
      {
        const targetNodeId = g.edge(outgoingEdge).data.target;
        const node = g.node(dagNodes.find(node => g.node(node).data.id === targetNodeId));
        if (!node.data.hidden && node.data.active)
        {
          g.edge(outgoingEdge).data.hidden = false;
        }
      }
    } 
  else 
    {
      const incomingEdge = g.inEdges(c).find(edge => g.edge(edge).data.source === n.data.id);
      g.edge(incomingEdge).data.hidden = false;
    }
  }
  path.pop();
}

function click_dagre(n, dag, svgID) {
  console.log(`you are clicking on node ${n.data.id}`);

  if (n.data.active === undefined) {
    return;
  }

  if (n.data.hidden) {
    /* You can't click on hidden nodes */
    return;
  }
  n.data.active = !n.data.active;
  if (n.data.active) {
    increment_refcount_dagre(n, dag);
  } else {
    decrement_refcount_dagre(n, dag);
  }
  visualizeDAG_dagre(dag, svgID)
}


function setupSVG(svgID) {

  const svg = d3.select(svgID);

  // Define an arrowhead marker for directed edges
  let arrowhead = svg.select('#arrowhead')
  if(arrowhead.empty()){
    svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('refX', 6) 
    .attr('refY', 2) 
    .attr('markerWidth', 10) 
    .attr('markerHeight', 10) 
    .attr('orient', 'auto-start-reverse') 
    .append('path')
    .attr('d', 'M 0,0 V 4 L6,2 Z');
  }

  // clear contents everytime
  svg.select('#links').html('');
  svg.select('#nodes').html('');
}

function computeConnectingLineCoords(data, index, type)
{
  const numFlags = numberOfFlagTypes(data.flag);
  let offset = 0;

  if (numFlags > 1)
  {
    if (type === 'to/from')
    {
      offset = -8;
    }
    else if (type === 'assoc')
    {
      offset = 8;
    }
  }

  let startingPoint = [ computeAlignmentHost() + rectWidth + gap, (rectHeight / 2) + header + (index * (verticalMargin + rectHeight)) + offset];
  let endingPoint = [ computeAlignmentTarget() - gap, (rectHeight / 2) + header + (index * (verticalMargin + rectHeight)) + offset];
  if (isFromDataMovement(data.flag))
  {
    let swap = startingPoint;
    startingPoint = endingPoint;
    endingPoint = swap;
  }
  return [startingPoint, endingPoint];
}

function computeSVGWidth() {
  return computeAlignmentTarget() + rectWidth;
}

function computeSVGHeight(n) {
  return (n * rectHeight + Math.max(0, (n - 1)) * verticalMargin);
}

function computeAlignmentHost() {
  const hostHeader = document.getElementById('memory-vis-header-host');
  return (hostHeader.offsetWidth - rectWidth) / 2;
}

function computeAlignmentTarget() {
  const hostHeader = document.getElementById('memory-vis-header-host');
  const divider = document.getElementById('memory-vis-header-gap');
  const targetHeader = document.getElementById('memory-vis-header-target');
  return hostHeader.offsetWidth + divider.offsetWidth + (targetHeader.offsetWidth - rectWidth) / 2;
}

function isMovementFrameLargeEnough() {
  const subheadingDiv = document.getElementById('memory-vis-header-subheading');
  return subheadingDiv.offsetWidth >= 2 * gap + 2 * rectWidth + horizontalDivision;
}

function initializeSVG(n) {
  const svg = d3.select('#memory-vis-display');
  const svgWidth = computeSVGWidth();
  const svgHeight = computeSVGHeight(n);
  
  svg.attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight);
  svg.attr('width', svgWidth);
  svg.attr('height', svgHeight);
  return svg;
}

function transitionHeader(opening) {
  const header = d3.select('#memory-vis-header');

  const hostSubheading = d3.select('#memory-vis-header-host');
  const targetSubheading = d3.select('#memory-vis-header-target');

  if (opening) {
    header.transition()
    .duration(450)
    .ease(d3.easeLinear)
    .style('opacity', '1');

    hostSubheading.transition()
    .duration(450)
    .ease(d3.easeLinear)
    .style('opacity', '1');

    targetSubheading.transition()
    .duration(450)
    .ease(d3.easeLinear)
    .style('opacity', '1');
  }
  else {
    header.style('opacity', '0');
    hostSubheading.style('opacity', '0');
    targetSubheading.style('opacity', '0');
  }
}

function visualizeDataMovement(dataMove, opening) {
  if (!isMovementFrameLargeEnough()) {
    return;
  }

  const svg = initializeSVG(dataMove.datamove.length);
  const trans = svg.transition().duration(450).ease(d3.easeLinear);
  transitionHeader(opening);

  svg
    .select('#data-transfer')
    .selectAll('g')
    .data(dataMove.datamove)
    .join(
      enter => 
      {
        enter
          .append('g')
          .attr('opacity', 0)
          .call(
            enter => 
            {
              const hostRectX = computeAlignmentHost();
              enter.append('rect')
                .attr('x', hostRectX)
                .attr('y', (data, index) => header + (index * (verticalMargin + rectHeight)))
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('rx', 16)
                .style('fill', 'orange');

              enter.append('text')
                .text(data => data.orig_address)
                .attr('x', hostRectX + horizontalMargin)
                .attr('y', (data, index) => offset + header + (index * (verticalMargin + rectHeight)))
                .attr('fill', 'black')
                .attr('opacity', 1)
                .attr('font-family', 'Arial')
                .attr('font-size', '12px');
              
              const targetRectX = computeAlignmentTarget();
              enter.append('rect')
              .attr('x', targetRectX)
              .attr('y', (data, index) => header + (index * (verticalMargin + rectHeight)))
              .attr('width', rectWidth)
              .attr('height', rectHeight)
              .attr('rx', 16)
              .attr('opacity', 1)
              .style('fill', 'lime');

              enter.append('text')
                .text(data => data.dest_address)
                .attr('x', horizontalMargin + targetRectX)
                .attr('y', (data, index) => offset + header + (index * (verticalMargin + rectHeight)))
                .attr('fill', 'black')
                .attr('opacity', 1)
                .attr('font-family', 'Arial')
                .attr('font-size', '12px');

              enter.filter(d => {
                return isToDataMovement(d.flag) || isFromDataMovement(d.flag);
              })
              .append('path')
              .attr('d', data => 
              {
                const points = computeConnectingLineCoords(data, data.index, 'to/from');
                return d3.line()(points);
              })
              .attr('stroke', 'black')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('stroke-dasharray', e => {
                const dx = horizontalDivision - 8;
                const dy = 0;
                
                const edgeLength = Math.sqrt(dx * dx + dy * dy);
                const repeat = Math.ceil(edgeLength / d3.sum(dashDimensions));
                const array = (dashDimensions.join(' ') + ' ').repeat(repeat);
                return array;
              })
              .transition()
              .on('start', function repeat() {
                d3.active(this)
                  .transition()
                  .duration(16000)
                  .ease(d3.easeLinear)
                  .styleTween('stroke-dashoffset', function() {
                    return d3.interpolate(960, 0);
                  })
                  .on('end', repeat);
              });

              /**
               * Growing solid arrow animation used to denote associate data movement.
               */
              enter.filter(d => {
                return isAssociateDataMovement(d.flag);
              })
              .append('path')
              .attr('stroke', 'black')
              .attr('fill', 'none')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('d', data => {
                let points = computeConnectingLineCoords(data, data.index, 'assoc');
                points[1][0] = points[0][0] + 10;
                points[1][1] = points[0][1];
                return d3.line()(points);
              })
              .transition()
              .on('start', function repeat() {
                d3.active(this)
                .transition(d3.easePoly.exponent(3))
                .duration(4000)
                .attrTween('d', function(data) {
                  return function(t) {
                    let points = computeConnectingLineCoords(data, data.index, 'assoc');
                    const dx = points[1][0] - (points[0][0] + 10);
                    points[1][0] = (points[0][0] + 10) + (dx * t);
                    return d3.line()(points);
                  }
                })
                .transition()
                .duration(500)
                .attr('d', data => {
                  let points = computeConnectingLineCoords(data, data.index, 'assoc');
                  points[1][0] = points[0][0] + 10;
                  points[1][1] = points[0][1];
                  return d3.line()(points);
                })
                .on('start', repeat);
              });

              /**
               * Fading double arrow line used to denote disassociate data movement.
               * 
               * https://stackoverflow.com/questions/54852791/angular-d3-understanding-attrtween-function
               */
              enter.filter(d => {
                return isDisassociateDataMovement(d.flag);
              })
              .append('path')
              .attr('d', data => {
                const points = computeConnectingLineCoords(data, data.index, 'assoc');
                return d3.line()(points);
              })
              .attr('stroke', 'black')
              .attr('fill', 'none')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('marker-start', 'url(#arrowhead)')
              .attr('opacity', 1)
              .transition()
              .on('start', function repeat() {
                d3.active(this)
                .transition(d3.easeLinear)
                .duration(4000)
                .attr('opacity', 0)
                .transition()
                .duration(500)
                .attr('opacity', 1)
                .transition()
                .duration(2500)
                .on('start', repeat);
              });
              
              enter.transition(trans)
              .attr('opacity', 1);
            });
      },
      update => {
        
      },
      exit => {
        exit.transition(trans)
        .attr('opacity', 0)
        .remove();
      });
}

function populateIndices(datamove) {
  for (let i = 0; i < datamove.length; ++i) {
    datamove[i].index = i;
  }
}

//setupSVG("#svg");
//visualizeDAG(dag_initial_graph,"#svg");


function visualizeDAG_dagre(g, svgID, dataMovementInfo) {
  dagre.layout(g);
  const width = g.graph().width;
  const height = g.graph().height;

  const svg = d3.select(svgID)
  .attr('width', width)
  .attr('height', height);
  
  const trans = svg.transition().duration(300);

  let tooltip = d3.select('#tooltip');

  // Create SVG elements for nodes
  svg
    .select('#nodes')
    .selectAll('g')
    .data(Array.from(dag.nodes()), n => n)
    .join(
      enter => {
        enter
          .append('g')
          .attr('transform', n => `translate(${g.node(n).x}, ${g.node(n).y})`)
          .attr('opacity', 0)
          .call(
            enter => {
              enter.append('circle')
                .on('click', n => click_dagre(g.node(n), g, svgID))
                .attr('r', nodeRadius)
                .attr('cursor', 'pointer')
                .attr('fill', n => get_node_color(g.node(n)))
                .on('mouseover', n => {
                  tooltip.style('visibility', 'visible');
                  if (!dataMovementInfo) {
                    return;
                  }

                  const nodeIdNum = get_node_id_num(g.node(n)) + '';
                  let index = dataMovementInfo.findIndex(tr => tr.begin_node === nodeIdNum);
                  if (index !== -1) 
                  {
                    /* Hovered over a node with beginning data transfer */
                    const clone = JSON.parse(JSON.stringify(dataMovementInfo[index]));
                    clone.datamove = dataMovementInfo[index].datamove.filter(x => shouldShowOnBeginNode(x.flag));
                    populateIndices(clone.datamove);
                    visualizeDataMovement(clone, true);
                    return;
                  }
                  
                  index = dataMovementInfo.findIndex(tr => tr.end_node === nodeIdNum);
                  if (index !== -1)
                  {
                    const clone = JSON.parse(JSON.stringify(dataMovementInfo[index]));
                    clone.datamove = dataMovementInfo[index].datamove.filter(x => shouldShowOnEndNode(x.flag));
                    populateIndices(clone.datamove);
                    visualizeDataMovement(clone, true);
                    return;
                  }
                })
                .on('mousemove', n => {
                  let text = 
                  `<strong>this node ends with: <span class='colored-text'>${g.node(n).data.end_event}</span> </strong> <br>
                   <strong>this node has a race: <span class='colored-text'>${(g.node(n).data.has_race) ? 'YES' : 'NO'}</span> </strong> <br>
                   <strong>stack: <span class="colored-text">${g.node(n).data.stack}</span> </strong> <br>`
                  
                  tooltip.html(text)
                })
                .on('mouseout', n => {
                  tooltip.style('visibility', 'hidden');
                  if (!dataMovementInfo) {
                    return;
                  }
                  const nodeIdNum = get_node_id_num(g.node(n)) + '';
                  const index = dataMovementInfo.findIndex(tr => tr.begin_node === nodeIdNum || tr.end_node === nodeIdNum);
                  if (index !== -1) 
                  {
                    /* Hovered over a node with beginning or ending data transfer */  
                    visualizeDataMovement({ begin_node: '', end_node: '', datamove: []}, false);
                  }
                })

              enter.append('text')
                .text(n => n)
                .attr('font-weight', 'bold')
                .attr('font-family', 'sans-serif')
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', 'white')
                .attr('class', 'unselectable-text')
                .attr('font-size', 'xx-small')
                .style('pointer-events', 'none');

              enter.transition(trans).attr('opacity', 1);

              enter.filter(n => g.node(n).data.has_race == 1)
              .append('circle')
              .attr('r', nodeRadius + 2)
              .attr('fill', 'none')
              .attr('stroke', 'blue') // Border color
              .attr('stroke-width', 3) // Border width
              .attr('stroke-dasharray', '4,4') // Dash pattern
                .append('animateTransform')
                .attr('attributeName','transform')
                .attr('type','rotate')
                .attr('from', n => `360 ${g.node(n).x/10000} ${g.node(n).y/10000}`)
                .attr('to', n => `0 ${g.node(n).x/10000} ${g.node(n).y/10000} `)
                .attr('dur','10s')
                .attr('repeatCount','indefinite');
              }
          )
        },
      update => {
        update.transition(trans)
        .select('circle')
        .attr('fill', n => get_node_color(g.node(n)))

        update.transition(trans)
        .selectAll('circle')
        .attr('opacity', n => get_node_opacity(g.node(n)))

        update.filter(n => g.node(n).data.hidden)
        .style('pointer-events', 'none');

        update.filter(n => g.node(n).data.hidden === false)
        .style('pointer-events', 'auto');
      },
      exit => {
        exit.remove();
      }
    );

  
  // link paths
  svg
    .select('#links')
    .selectAll('path')
    .data(g.edges(), e => e.v + '-->' + e.w)
    .join(
      enter => { 
        enter
        .append('path')
        .attr('d', e => {
          pts = g.edge(e).points;
          return d3.line()
                  .x((p) => p.x)
                  .y((p) => p.y)
                  .curve(d3.curveMonotoneY)(pts);
        })
        .attr('class', e => get_edge_type(g.edge(e)))
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', e => get_edge_color(g.edge(e)))
        .attr('marker-end', e => {
          if (g.edge(e).data != undefined && g.edge(e).data.edge_type === "BARRIER"){
            return ''
          }
          return 'url(#arrowhead)'
        })
        .attr('opacity', e => get_edge_opacity(g.edge(e)))
        .attr('stroke-dasharray', e => get_edge_dash(g.edge(e)))
      },
      update => {
        update.transition(trans)
              .attr('opacity', e => get_edge_opacity(g.edge(e)))
      },
      exit => {
        exit.remove()
      }
    );

  d3.selectAll('.TARGET')
  .attr('opacity', e => get_edge_opacity(g.edge(e)))
  .attr('stroke-dasharray', '4')
  .attr('marker-end', 'url(#arrowhead)')
  .transition()
  .on('start', function repeat() {
    d3.active(this)
      .transition()
      .duration(16000)
      .ease(d3.easeLinear)
      .styleTween('stroke-dashoffset', function() {
        return d3.interpolate(960, 0);
      })
      .on('end', repeat);
  });
}