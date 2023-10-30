// create our builder and turn the raw data into a graph
const builder = d3.graphStratify();
const dag_initial_graph = builder(data);

// set up initial data. These Maps are important if we
// are going to remove nodes/edges from graph, and add
// back later. For now, I will comment them out because
// the current strategy is just to hide nodes/edges
// const nodeMap = new Map();
// const parentMap = new Map();
// const childMap = new Map();

// for (const record of data){
//   parentMap.set(record.id, record.parentIds)
// }

// for (const [id,parentIDs] of parentMap.entries()) {

//   for(const parentID of parentIDs){
//     const ids = childMap.get(parentID);
//     if (ids === undefined) {  
//       childMap.set(parentID, [id]);
//     }
//     else{
//       ids.push(id);
//     }
//   }
// }

// for(const node of dag_initial_graph.nodes()){
//   nodeMap.set(node.data.id, node)
// }


function hide_descendant(n, level=0){
  if(level != 0){
    for (const link of [...n.parentLinks()]) {
      link.data.hidden = true
    }
  }
  
  for (const link of [...n.childLinks()]) {
    link.data.hidden = true

    link.target.data.hidden = true
  }

  for(const child of n.children()){
    if(child.data.active){
      hide_descendant(child, level+1)
    }
    else{
      for (const link of [...child.parentLinks()]) {
        link.data.hidden = true
      }
    }
  }
}


function show_descendant(n, level=0){
  if(level != 0){
    for (const link of [...n.parentLinks()]) {
      if(!link.source.data.hidden && link.source.data.active){
        link.data.hidden = false
      }
    }
  }

  for (const link of [...n.childLinks()]) {
    link.data.hidden = false

    link.target.data.hidden = false
  }

  for(const child of n.children()){
    if(child.data.active && !child.data.hidden){
      show_descendant(child, level + 1)
    }
    else if(!child.data.active && !child.data.hidden){
      for (const link of [...child.parentLinks()]) {
        if(!link.source.data.hidden && link.source.data.active){
          link.data.hidden = false
        }
      }
    }
  }
}


function click(n, dag, svgID) {
  console.log(`you are clicking on node ${n.data.id}`)

  if (n.data.active === undefined) {
    return
  }

  n.data.active = !n.data.active;

  if (n.data.active) {
    show_descendant(n)
  } else {
    hide_descendant(n)
  }
  visualizeDAG(dag, svgID)
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
  svg.select("#links").html("");
  svg.select("#nodes").html("");
}


function visualizeDAG(dag, svgID, dataMovementInfo) {

  const layout = d3.sugiyama()
      .nodeSize(nodeSize)
      .gap([nodeRadius*2, nodeRadius*2])
      .tweaks([shape]);

  const { width, height } = layout(dag);

  const svg = d3.select(svgID)
  .attr('width', width + 50)
  .attr('height', height + 50);

  const trans = svg.transition().duration(300);

  let tooltip = d3.select("#tooltip")

  // Create SVG elements for nodes
  svg
    .select("#nodes")
    .selectAll("g")
    .data(Array.from(dag.nodes()), n => n.data.id)
    .join(
      enter => {
        enter
          .append("g")
          .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
          .attr("opacity", 0)
          .call(
            enter => {
              enter.append("circle")
                .on("click", n => click(n, dag, svgID))
                .attr("r", nodeRadius)
                .attr("cursor", "pointer")
                .attr("fill", n => get_node_color(n,dag))
                .on("mouseover", n => {
                  tooltip.style("visibility", "visible");
                  const nodeIdNum = get_node_id_num(n);
                  const indexOf = dataMovementInfo.findIndex(tr => tr.begin_node === nodeIdNum || tr.end_node === nodeIdNum);
                  if (indexOf !== -1) 
                  {
                    /* Hovered over a node with beginning or ending data transfer */  
                  }
                })
                .on("mousemove", n => {
                  let text = 
                  `<strong>this node ends with: <span class="colored-text">${n.data.end_event}</span> </strong> <br>
                   <strong>this node has a race: <span class="colored-text">${(n.data.has_race) ? "YES" : "NO"}</span> </strong> <br>`

                  if(n.data.has_race == 1){
                    text = text + `<strong>race stack: <span class="colored-text">${n.data.race_stack}</span> </strong> <br>`
                  }
                  tooltip.html(text)
                })
                .on("mouseout", n => {
                  tooltip.style("visibility", "hidden");
                })

              enter.append("text")
                .text(d => d.data.id)
                .attr("font-weight", "bold")
                .attr("font-family", "sans-serif")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("fill", "white")
                .attr("class", "unselectable-text")
                .attr("font-size", "xx-small")
                .style("pointer-events", "none");

              enter.transition(trans).attr("opacity", 1);

              enter.filter((n) => (n.data.has_race == 1))
              .append("circle")
              .attr("r", nodeRadius + 2)
              .attr("fill", "none")
              .attr("stroke", "blue") // Border color
              .attr("stroke-width", 3) // Border width
              .attr("stroke-dasharray", "4,4") // Dash pattern
                .append("animateTransform")
                .attr("attributeName","transform")
                .attr("type","rotate")
                .attr("from", (n) => `360 ${n.x/10000} ${n.y/10000}`)
                .attr("to", (n) => `0 ${n.x/10000} ${n.y/10000} `)
                .attr("dur","10s")
                .attr("repeatCount","indefinite");
              }
          )
        },
      (update) => {
        update.transition(trans)
        .select("circle")
        .attr("fill", (n) => get_node_color(n,dag))

        update.transition(trans)
        .selectAll("circle")
        .attr("opacity", (n) => get_node_opacity(n))

        update.filter((n) => (n.data.hidden))
        .style("pointer-events", "none");

        update.filter((n) => (n.data.hidden === false))
        .style("pointer-events", "auto");
      },
      (exit) => {
        exit.remove()
      }
    );

  
  // link paths
  svg
    .select("#links")
    .selectAll("path")
    .data(Array.from(dag.links()), e => get_edge_id(e))
    .join(
      (enter) => { 
        let allpath = enter
        .append("path")
        .attr("d", e => {
          return d3.line().curve(d3.curveMonotoneY)(e.points);
        })
        .attr("class", e => get_edge_type(e))
        .attr("fill", "none")
        .attr("stroke-width", e => get_edge_width(e))
        .attr("stroke", e => get_edge_color(e))
        .attr('marker-end', 'url(#arrowhead)')
        .attr("opacity", e => get_edge_opacity(e))
        .attr("stroke-dasharray", e => get_edge_dash(e))
        .call(enter => enter.transition(trans).attr("opacity", 1));
      },
      (update) => {
        update.transition(trans)
              .attr("opacity", e => get_edge_opacity(e))
      },
      (exit) => {
        exit.remove()
      }
    );
      
    d3.selectAll(".TARGET")
    .attr("opacity", e => get_edge_opacity(e))
    .attr("stroke-dasharray", e => {
      const dx = e.points[0][0] - e.points[1][0];
      const dy = e.points[0][1] - e.points[1][1];
      
      const dashDimensions = [8, 5];
      const edgeLength = Math.sqrt(dx * dx + dy * dy);
      const repeat = Math.ceil(edgeLength / d3.sum(dashDimensions));
      const array = (dashDimensions.join(" ") + " ").repeat(repeat);
      return array;
    })
    .transition()
    .on("start", function repeat() {
      d3.active(this)
        .transition()
        .duration(16000)
        .ease(d3.easeLinear)
        .styleTween("stroke-dashoffset", function() {
          return d3.interpolate(960, 0);
        })
        .on("end", repeat);
    });
}

//setupSVG("#svg");
//visualizeDAG(dag_initial_graph,"#svg");