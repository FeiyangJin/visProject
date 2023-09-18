// set the layout functions
const nodeRadius = 15;
const nodeSize = [nodeRadius * 2, nodeRadius * 2];
// this truncates the edges so we can render arrows nicely
const shape = d3.tweakShape(nodeSize, d3.shapeEllipse);

let data = [
  {
    id: "0",
    active: true,
    parentIds: ["8"]
  },
  {
    id: "1",
    active: true,
    parentIds: []
  },
  {
    id: "2",
    active: true,
    parentIds: []
  },
  {
    id: "3",
    active: true,
    parentIds: ["11"]
  },
  {
    id: "4",
    active: true,
    parentIds: ["12"]
  },
  {
    id: "5",
    active: true,
    parentIds: ["18"]
  },
  {
    id: "6",
    active: true,
    parentIds: ["9", "15", "17"]
  },
  {
    id: "7",
    active: true,
    parentIds: ["3", "17", "20", "21"]
  },
  {
    id: "8",
    active: true,
    parentIds: []
  },
  {
    id: "9",
    active: true,
    parentIds: ["4"]
  },
  {
    id: "10",
    active: true,
    parentIds: ["16", "21"]
  },
  {
    id: "11",
    active: true,
    parentIds: ["2"]
  },
  {
    id: "12",
    active: true,
    parentIds: ["21"]
  },
  {
    id: "13",
    active: true,
    parentIds: ["4", "12"]
  },
  {
    id: "14",
    active: true,
    parentIds: ["1", "8"]
  },
  {
    id: "15",
    active: true,
    parentIds: []
  },
  {
    id: "16",
    active: true,
    parentIds: ["0"]
  },
  {
    id: "17",
    active: true,
    parentIds: ["19"]
  },
  {
    id: "18",
    active: true,
    parentIds: ["9"]
  },
  {
    id: "19",
    active: true,
    parentIds: []
  },
  {
    id: "20",
    active: true,
    parentIds: ["13"]
  },
  {
    id: "21",
    active: true,
    parentIds: []
  }
];


data = [
  {
    id: "0",
    active: true,
    parentIds: []
  },
  {
    id: "1",
    active: true,
    parentIds: ["0"]
  },
  {
    id: "2",
    active: true,
    parentIds: ["0"]
  },
  {
    id: "3",
    active: true,
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
  parentMap[record.id] = record.parentIds
}
console.log(parentMap)

function click(n,dag) {
  if (n.data.active === undefined){
    return
  }

  n.data.active = !n.data.active;

  console.log(`you are clicking on node ${n.data.id}`)

  // for(const child of n.children()){
  //   console.log(`child id is ${child.data.id}`)
  // }

  if(n.data.active){
    let par = dag.node({ id: "0"});
    n.parent(par)
  }
  else{
    // for (const link of [...n.childLinks()]) {
    //   console.log(get_edge_id(link))
    //   link.delete()
    // }

    for (const link of [...n.parentLinks()]) {
      console.log(get_edge_id(link))
      link.delete()
    }
  }


  visualizeDAG(dag)
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

  if (n.data.active === false){
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
                .on("click", n => click(n,dag))
                .attr("r", nodeRadius)
                .attr("fill", (n) => get_node_color(n,dag));
              enter
                .append("text")
                .text(d => d.data.id)
                .attr("font-weight", "bold")
                .attr("font-family", "sans-serif")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("fill", "white")
                .attr("font-size", "xx-small");
              enter.transition(trans).attr("opacity", 1);
            },
          )
        },
      (update) => {
        update.transition(trans)
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .select("circle")
        .attr("r", nodeRadius)
        .attr("fill", (n) => get_node_color(n,dag))
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
        .attr("d", (e) => d3.line()(e.points))
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke","black")
        .attr('marker-end', 'url(#arrowhead)')
        .attr("opacity", 0)
        .attr("stroke-dasharray", (e) => get_edge_dash(e))
        .call((enter) => enter.transition(trans).attr("opacity", 1))
      },
      (update) => {
        update.transition(trans).attr("d", (e) => d3.line()(e.points))
      },
      (exit) => {
        exit.remove()
      }

    );
}


visualizeDAG(dag_initial_graph);