data = [
  {
    id: "0",
    active: true,
    hidden: false,
    parentIds: []
  },
  {
    id: "1",
    active: true,
    hidden: false,
    parentIds: ["0"]
  },
  {
    id: "2",
    active: true,
    hidden: false,
    parentIds: ["0"]
  },
  {
    id: "3",
    active: true,
    hidden: false,
    parentIds: ["1"]
  },
];


// create our builder and turn the raw data into a graph
const builder = d3.graphStratify();
const dag_initial_graph = builder(data);

const nodeMap = new Map();
const parentMap = new Map();
const childMap = new Map();

for (const record of data){
  parentMap.set(record.id, record.parentIds)
}

for (const [id,parentIDs] of parentMap.entries()) {

  for(const parentID of parentIDs){
    const ids = childMap.get(parentID);
    if (ids === undefined) {  
      childMap.set(parentID, [id]);
    }
    else{
      ids.push(id);
    }
  }
}

for(const node of dag_initial_graph.nodes()){
  nodeMap.set(node.data.id, node)
}


function click(n,dag,svgID) {
  if (n.data.active === undefined){
    return
  }

  n.data.active = !n.data.active;

  console.log(`you are clicking on node ${n.data.id}`)

  // for(const child of n.children()){
  //   console.log(`child id is ${child.data.id}`)
  // }

  let node = nodeMap.get(n.data.id)

  // for(const parentID of parentMap.get(n.data.id)){
  //   let par = nodeMap.get(parentID)
  //   node.parent(par)
  // }
  for(const child of n.children()){
    child.data.hidden = n.data.active ? false : true
  }

  for (const link of [...n.childLinks()]) {
    if(link.data === undefined){
      link.data = new Object()
    }
    link.data.hidden = n.data.active ? false : true
  }

  visualizeDAG(dag,svgID)
}


function get_edge_id(e){
  let id
  if (e.info === undefined){
    id = e.source.data.id + "-->" + e.target.data.id
  }
  else{
    id = e.info.source.data.id + "-->" + e.info.target.data.id
  }
  
  return id
}


function get_edge_dash(e){
  if(e.data === undefined){
    return "0"
  }

  if(e.data.edge_type === "FORK_I" || e.data.edge_type === "FORK_E"){
    return "4"
  }

  if(e.data.edge_type === "JOIN" || e.data.edge_type === "JOIN_E"){
    return "1,4"
  }
}


function get_node_color(n,dag){
  // colors
  const steps = dag.nnodes() - 1;
  const interp = d3.interpolateRainbow;
  const colorMap = new Map(
    [...dag.nodes()]
      .sort((a, b) => a.y - b.y)
      .map((node, i) => [node.data.id, interp(i / steps)])
  );

  if (!n.data.active){
    return "black"
  }

  if (n.data.has_race === undefined){
    return colorMap.get(n.data.id)
  }

  if (n.data.has_race == 0){
    return "orange"
  }
  return "blue"
}


function get_node_opacity(n){
  if(n.data.hidden){
    return 0
  }
  return 1
}


function get_edge_opacity(e){
  if(e.data === undefined){
    return "1"
  }

  if(e.data.hidden){
    return "0"
  }

  return "1"
}

function visualizeDAG(dag, svgID="#svg"){

  const layout = d3.sugiyama()
      .nodeSize(nodeSize)
      .gap([nodeRadius*2, nodeRadius*2])
      .tweaks([shape]);

  const { width, height } = layout(dag);

  const svg = d3.select(svgID)
  .attr('width', width + 15)
  .attr('height', height + 15);
  const trans = svg.transition().duration(750);

  // Create SVG elements for nodes
  svg
    .select("#nodes")
    .selectAll("g")
    .data(Array.from(dag.nodes()), n => n.data.id)
    .join(
      (enter) =>{
        enter
          .append("g")
          .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
          .attr("opacity", 0)
          .call(
            (enter) => {
              enter
                .append("circle")
                .on("click", n => click(n,dag,svgID))
                .attr("r", nodeRadius)
                .attr("cursor", "pointer")
                .attr("fill", (n) => get_node_color(n,dag));
              enter
                .append("text")
                .text(d => d.data.id)
                .attr("font-weight", "bold")
                .attr("font-family", "sans-serif")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("fill", "white")
                .attr("class", "unselectable-text")
                .attr("font-size", "xx-small");
              enter.transition(trans).attr("opacity", 1);
            },
          )
        },
      (update) => {
        update.transition(trans)
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .select("circle")
        .attr("fill", (n) => get_node_color(n,dag))
        .attr("opacity", (n) => get_node_opacity(n))
      },
      (exit) => {
        exit.remove()
      }
    );


  // Define an arrowhead marker for directed edges
  svg.append('defs').append('marker')
  .attr('id', 'arrowhead')
  .attr('refX', 6) 
  .attr('refY', 2) 
  .attr('markerWidth', 10) 
  .attr('markerHeight', 10) 
  .attr('orient', 'auto-start-reverse') 
  .append('path')
  .attr('d', 'M 0,0 V 4 L6,2 Z');

  
  // link paths
  svg
    .select("#links")
    .selectAll("path")
    .data(Array.from(dag.links()), e => get_edge_id(e))
    .join(
      (enter) =>{
        enter
        .append("path")
        .attr("d", (e) => d3.line().curve(d3.curveMonotoneY)(e.points))
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke","black")
        .attr('marker-end', 'url(#arrowhead)')
        .attr("opacity", 0)
        .attr("stroke-dasharray", (e) => get_edge_dash(e))
        .call((enter) => enter.transition(trans).attr("opacity", 1))
      },
      (update) => {
        update.transition(trans)
              .attr("d", (e) => d3.line().curve(d3.curveMonotoneY)(e.points))
              .attr("opacity", (e) => get_edge_opacity(e))
      },
      (exit) => {
        exit.remove()
      }

    );
}


visualizeDAG(dag_initial_graph);